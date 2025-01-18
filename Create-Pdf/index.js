const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");

const dynamoDBClient = new DynamoDBClient({ region: "ap-south-1" });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);


exports.handler = async (event) => {
  console.log(event);

  function splitText(text, maxWidth, fontSize, font) {
    const words = text.split(" ");
    let line = "";
    const lines = [];
    let currentWidth = 0;

    for (const word of words) {
      const wordWidth = font.widthOfTextAtSize(word, fontSize);
      if (currentWidth + wordWidth > maxWidth) {
        lines.push(line.trim());
        line = word + " ";
        currentWidth = wordWidth;
      } else {
        line += word + " ";
        currentWidth += wordWidth;
      }
    }
    lines.push(line.trim());
    return lines;
  }


  function numberToWords(num) {
    const a = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const b = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];
  
    const convert = (n) => {
      if (n < 20) return a[n];
      if (n < 100)
        return (
          b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : "")
        );
      if (n < 1000)
        return (
          a[Math.floor(n / 100)] +
          " Hundred" +
          (n % 100 !== 0 ? " and " + convert(n % 100) : "")
        );
      if (n < 1000000)
        return (
          convert(Math.floor(n / 1000)) +
          " Thousand" +
          (n % 1000 !== 0 ? " and " + convert(n % 1000) : "")
        );
      if (n < 1000000000)
        return (
          convert(Math.floor(n / 1000000)) +
          " Million" +
          (n % 1000000 !== 0 ? " and " + convert(n % 1000000) : "")
        );
      return "";
    };
  
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    const rupeeWords =
      convert(rupees) + (rupees > 1 ? " Rupees" : " Rupee");
    const paiseWords = paise > 0 ? " and " + convert(paise) + " Paise" : "";
    return rupeeWords + paiseWords + " Only";
  }
  
  

  try {
    const { tenderValue, CompanyName, Unit, listItems, TermsAndConditions } =
      JSON.parse(event.body);

    console.log(tenderValue, CompanyName, listItems, TermsAndConditions);
    const base64FilePath = path.join(__dirname, "pdfBase64.txt");
    const base64ExistingPdf = fs.readFileSync(base64FilePath, "utf8");
    const existingPdfBytes = Uint8Array.from(
      Buffer.from(base64ExistingPdf, "base64")
    );

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanFontBold = await pdfDoc.embedFont(
      StandardFonts.TimesRomanBold
    );
    const blackColor = rgb(0, 0, 0);

    const footerSpace = 80;
    const pages = pdfDoc.getPages();
    let currentPage = pages[0];
    let itemY = 740;

    // Header
    currentPage.drawText(tenderValue, {
      x: 50,
      y: itemY,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });
    currentPage.drawText(
      `DATE: ${new Date().toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })}`,
      {
        x: 450,
        y: itemY,
        size: 12,
        font: timesRomanFontBold,
        color: blackColor,
      }
    );
    itemY -= 20;

    // Fetch vendor details from DynamoDB
    const params = {
      TableName: "Vendor", // Replace with your table name
      FilterExpression: "#name = :CompanyName",
      ExpressionAttributeNames: { "#name": "Name" },
      ExpressionAttributeValues: { ":CompanyName": CompanyName },
    };

    const data = await docClient.send(new ScanCommand(params));
    const CustomerData = data.Items && data.Items[0];
    if (!CustomerData) {
      throw new Error("Customer data not found");
    }

    console.log(CustomerData);

    const {
      Values: { Address: CustomerAddress },
    } = CustomerData;
    console.log(CustomerAddress);

    const recipientDetails = [
      "TO,",
      "Dear Sir,",
      `${CompanyName} - UNIT - ${Unit}`,
      `${CustomerAddress}`,
      "Ref: As per your Drawings.",
      "With the below reference We are pleased to quote our lowest offer for",
      "manufacturing of your items as follows:",
    ];
    
    // Function to split text into multiple lines
    function wrapText(text, maxWidth, font, fontSize) {
      const words = text.split(" ");
      let line = "";
      const lines = [];
      words.forEach((word) => {
        const testLine = line + word + " ";
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        if (testWidth > maxWidth && line !== "") {
          lines.push(line.trim());
          line = word + " ";
        } else {
          line = testLine;
        }
      });
      lines.push(line.trim());
      return lines;
    }
    
    // Maximum width for wrapping text
    const maxTextWidth = 500;
    
    recipientDetails.forEach((text) => {
      // Wrap text for long lines
      const wrappedLines =
        text === CustomerAddress
          ? wrapText(text, maxTextWidth, timesRomanFontBold, 12)
          : [text];
    
      wrappedLines.forEach((line) => {
        if (itemY < footerSpace) {
          currentPage = pages[1] || pdfDoc.addPage(); // Use second page if it exists, otherwise add a new one
          itemY = 740;
        }
        currentPage.drawText(line, {
          x: 50,
          y: itemY,
          size: 12,
          font: timesRomanFontBold,
          color: blackColor,
        });
        itemY -= 20;
      });
    });
    

    // Table headers

    const tableHeaders = [
      "SNO",
      "ITEM CODE",
      "DESCRIPTION",
      "Qty/Sets",
      "Unit price",
      "Total Price(INR)",
    ];
    const tableXPositions = [50, 75, 160, 350, 400, 470];
    const maxWidthForColumns = [30, 80, 160, 180, 100];

    const rowHeight = 25;
    const cellPadding = 5;

    // Draw table headers with padding and borders
    tableHeaders.forEach((header, index) => {
      currentPage.drawText(header, {
        x: tableXPositions[index] + cellPadding,
        y: itemY,
        size: 8,
        font: timesRomanFontBold,
        color: blackColor,
      });
    });

    // Draw horizontal line above header row (top border)
    currentPage.drawLine({
      start: { x: tableXPositions[0], y: itemY + rowHeight / 2 },
      end: {
        x: tableXPositions[tableXPositions.length - 1] + 100,
        y: itemY + rowHeight / 2,
      },
      thickness: 1,
      color: blackColor,
    });

    // Draw horizontal line below header row (bottom border)
    currentPage.drawLine({
      start: { x: tableXPositions[0], y: itemY - rowHeight / 2 },
      end: {
        x: tableXPositions[tableXPositions.length - 1] + 100,
        y: itemY - rowHeight / 2,
      },
      thickness: 1,
      color: blackColor,
    });

    // Draw vertical lines for header columns (excluding right line)
    tableXPositions.forEach((xPos) => {
      currentPage.drawLine({
        start: { x: xPos, y: itemY + rowHeight / 2 },
        end: { x: xPos, y: itemY - rowHeight / 2 },
        thickness: 1,
        color: blackColor,
      });
    });

    // Draw right vertical line after the header
    currentPage.drawLine({
      start: {
        x: tableXPositions[tableXPositions.length - 1] + 100,
        y: itemY + rowHeight / 2,
      },
      end: {
        x: tableXPositions[tableXPositions.length - 1] + 100,
        y: itemY - rowHeight / 2,
      },
      thickness: 1,
      color: blackColor,
    });

    // Draw rows with padding and borders
    itemY -= rowHeight;
    listItems.forEach((item) => {
      console.log("Item", item);
      if (itemY < footerSpace) {
        currentPage = pdfDoc.addPage();
        itemY = 740;
      }

      const rowTextY = itemY;

      // Draw each cell's content with padding
      currentPage.drawText(String(item.SNO), {
        x: tableXPositions[0] + cellPadding,
        y: rowTextY,
        size: 8,
        font: timesRomanFont,
        color: blackColor,
      });
      
      currentPage.drawText(item.itemCode, {
        x: tableXPositions[1] + cellPadding,
        y: rowTextY,
        size: 8,
        font: timesRomanFont,
        color: blackColor,
      });

      const maxColumnWidth = 180;
      let lineHeight = 10;
      const descriptionLines = splitText(
        item.description,
        maxWidthForColumns[2],
        9,
        timesRomanFont
      );
      const maxLinesInRow = Math.max(
        descriptionLines.length /* other fields */
      );
      const dynamicRowHeight = maxLinesInRow * lineHeight + 15;

      // Draw cell content
      descriptionLines.forEach((line, index) => {
        currentPage.drawText(line, {
          x: tableXPositions[2] + cellPadding,
          y: rowTextY - index * lineHeight,
          size: 9,
          font: timesRomanFont,
          color: blackColor,
        });
      });
      // currentPage.drawText(item.description, {
      //   x: tableXPositions[2] + cellPadding,
      //   y: rowTextY,
      //   size: 8,
      //   font: timesRomanFont,
      //   color: blackColor,
      // });
      currentPage.drawText(item.qty, {
        x: tableXPositions[3] + cellPadding,
        y: rowTextY,
        size: 8,
        font: timesRomanFont,
        color: blackColor,
      });
      currentPage.drawText(item.unitPrice, {
        x: tableXPositions[4] + cellPadding,
        y: rowTextY,
        size: 8,
        font: timesRomanFont,
        color: blackColor,
      });
      currentPage.drawText(`${item.totalPrice}`, {
        x: tableXPositions[5] + cellPadding,
        y: rowTextY,
        size: 8,
        font: timesRomanFont,
        color: blackColor,
      });

      // Draw horizontal line below each row
      currentPage.drawLine({
        start: { x: tableXPositions[0], y: rowTextY - dynamicRowHeight / 2 },
        end: {
          x: tableXPositions[tableXPositions.length - 1] + 100,
          y: rowTextY - dynamicRowHeight / 2,
        },
        thickness: 1,
        color: blackColor,
      });

      // Draw vertical lines for each row cell, including right border
      tableXPositions.forEach((xPos) => {
        currentPage.drawLine({
          start: { x: xPos, y: rowTextY + dynamicRowHeight - 12},
          end: { x: xPos, y: rowTextY - dynamicRowHeight + 12},
          thickness: 1,
          color: blackColor,
        });
      });
      currentPage.drawLine({
        start: {
          x: tableXPositions[tableXPositions.length - 1] + 100,
          y: rowTextY + dynamicRowHeight - 12,
        },
        end: {
          x: tableXPositions[tableXPositions.length - 1] + 100,
          y: rowTextY - dynamicRowHeight + 12,
        },
        thickness: 1,
        color: blackColor,
      });

      itemY -= dynamicRowHeight;
    });

    // Calculate total price
    const grandTotal = listItems.reduce(
      (acc, item) => acc + parseFloat(item.totalPrice),
      0
    );

    // Add total price to the PDF
    if (itemY < footerSpace) {
      currentPage = pdfDoc.addPage();
      itemY = 740;
    }

    currentPage.drawText("TOTAL Net Value INR:", {
      x: tableXPositions[3] + cellPadding, // Align to "Unit price" column
      y: itemY,
      size: 12,
      font: timesRomanFont,
      color: blackColor,
    });

    currentPage.drawText(`${grandTotal.toFixed(2)}`, {
      x: tableXPositions[5] + cellPadding, // Align to "Total Price" column
      y: itemY,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });

   
    // Convert total to words
    const totalInWords = numberToWords(grandTotal);
    const totalInWordsWrapped = wrapText(totalInWords, 400, timesRomanFont, 12);

    // Add total in words below the numeric total
    itemY -= rowHeight; // Adjust spacing for text in words
    if (itemY < footerSpace) {
      currentPage = pdfDoc.addPage();
      itemY = 740;
    }

    currentPage.drawText(`(TOTAL)`, {
      x: 50,
      y: itemY,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });

    totalInWordsWrapped.forEach((line, index) => {
      const textToDraw = index === 0 ? `RS. ${line}` : line; // Add "RS." only to the first line
      currentPage.drawText(textToDraw, {
        x: 105,
        y: itemY - index * 2, // Adjust spacing for each wrapped line
        size: 12,
        font: timesRomanFont,
        color: blackColor,
      });
      itemY -= 20;
    });
    

    // Draw horizontal line below total in words
    itemY -= 5; // Adjust spacing for the line
    currentPage.drawLine({
      start: { x: 50, y: itemY },
      end: { x: 550, y: itemY },
      thickness: 1,
      color: blackColor,
    });

    // Terms & conditions
    const termsY = itemY - 30;
    currentPage.drawText("TERMS & CONDITIONS:", {
      x: 50,
      y: termsY,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });
    currentPage.drawLine({
      start: { x: 50, y: termsY - 5 },
      end: { x: 180, y: termsY - 5 },
      thickness: 1,
      color: blackColor,
    });

    const terms = TermsAndConditions.split("\n");
    let bulletY = termsY - 20;
    terms.forEach((term) => {
      if (bulletY < footerSpace) {
        currentPage = pages[1] || pdfDoc.addPage();
        bulletY = 740;
      }
      currentPage.drawText(`• ${term}`, {
        x: 60,
        y: bulletY,
        size: 12,
        font: timesRomanFont,
        color: blackColor,
      });
      bulletY -= 20;
    });

    // Closing remarks
    if (bulletY < footerSpace) {
      currentPage = pages[1] || pdfDoc.addPage();
      bulletY = 740;
    }
    currentPage.drawText(
      "We trust our offer is competitive and expect your valued order.",
      {
        x: 50,
        y: bulletY - 20,
        size: 11,
        font: timesRomanFont,
        color: blackColor,
      }
    );

    // Signature
    if (bulletY - 60 < footerSpace) {
      currentPage = pages[1] || pdfDoc.addPage();
      bulletY = 740;
    }
    currentPage.drawText("For Sri Mahalakshmi Engineering Works,", {
      x: 50,
      y: bulletY - 60,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });
    currentPage.drawText("Authorized Signature", {
      x: 50,
      y: bulletY - 80,
      size: 12,
      font: timesRomanFont,
      color: blackColor,
    });

    // Draw the "Note" on the current page (if not the last page)
    // currentPage.drawText("Note: This is an Auto computer generated quotation", {
    //   x: 50,
    //   y: bulletY - 140,
    //   size: 9,
    //   font: timesRomanFont,
    //   color: blackColor,
    // });

    // Select the last page of the PDF
   // Define the bottom margin and text spacing
const bottomMargin = 20; 
const additionalTextY = bulletY - 140;

// Check if the "Note" will overlap the address, and if so, add a new page for the address and contact info
let lastPage = pdfDoc.getPages().at(-1);
let lastPageHeight = lastPage.getHeight();
let noteYPosition = additionalTextY;
let addressY = bottomMargin + 20;  // 20 points above the margin
let contactY = bottomMargin;  // Directly at the bottom margin

// If the Y position for the note is too high, add a new page for the address and contact information
if (noteYPosition - 60 < bottomMargin) {  // 60 is an arbitrary value to check if it's close to the bottom
  pdfDoc.addPage();  // Add a new page
  lastPage = pdfDoc.getPages().at(-1);  // Get the new last page
  noteYPosition = lastPageHeight - bottomMargin - 20;  // Recalculate the note position on the new page
  addressY = noteYPosition - 20;  // Adjust address Y position
  contactY = addressY - 20;  // Adjust contact Y position
}

// Add the "Note" text
lastPage.drawText("Note: This is an Auto computer generated quotation", {
  x: 50,
  y: noteYPosition,
  size: 9,
  font: timesRomanFont,
  color: blackColor,
});

// Draw the address on the last page
lastPage.drawText("#5-35/227, Prashanthi Nagar, Shaktipuram, Kukatpally, Hyderabad - 500072", {
  x: 125,
  y: addressY,
  size: 9,
  font: timesRomanFontBold,
  color: blackColor,
});

// Draw the contact information below the address
lastPage.drawText("9440860225, 9133022225 | srimahalakshmi216@gmail.com | www.srimahalakshmiengineeringworks.com", {
  x: 95,
  y: contactY,
  size: 9,
  font: timesRomanFontBold,
  color: blackColor,
});

    // Finalize the document
    const modifiedPdfBytes = await pdfDoc.save();
    const base64ModifiedPdf = Buffer.from(modifiedPdfBytes).toString("base64");

    return {
      statusCode: 200,
      body: base64ModifiedPdf,
    };
  } catch (error) {
    console.error("Error modifying PDF:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to modify PDF",
        error: error.message,
      }),
    };
  }
};
