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
  try {
    const {
      GatePass,
      VendorName,
      ReturnStatus,
      listItems,
      Issued_Date,
      Received_Date,
    } = JSON.parse(event.body);

    console.log(JSON.parse(event.body));

    console.log(
      GatePass,
      VendorName,
      ReturnStatus,
      listItems,
      Issued_Date,
      Received_Date
    );

    // function splitText(text, maxWidth, fontSize, font) {
    //   const words = text.split(" ");
    //   let line = "";
    //   const lines = [];
    //   let currentWidth = 0;

    //   for (const word of words) {
    //     const wordWidth = font.widthOfTextAtSize(word, fontSize);
    //     if (currentWidth + wordWidth > maxWidth) {
    //       lines.push(line.trim());
    //       line = word + " ";
    //       currentWidth = wordWidth;
    //     } else {
    //       line += word + " ";
    //       currentWidth += wordWidth;
    //     }
    //   }
    //   lines.push(line.trim());
    //   return lines;
    // }

    function splitText(text, maxWidth, fontSize, font) {
      const words = text.split(' ');
      let line = '';
      const lines = [];
      let currentWidth = 0;
    
      for (const word of words) {
        const wordWidth = font.widthOfTextAtSize(word, fontSize);
        if (currentWidth + wordWidth > maxWidth) {
          lines.push(line.trim());
          line = word + ' ';
          currentWidth = wordWidth;
        } else {
          line += word + ' ';
          currentWidth += wordWidth;
        }
      }
      lines.push(line.trim());
      return lines;
    }

    const params = {
      TableName: "Vendor", // Replace with your table name
      FilterExpression: "#name = :VendorName",
      ExpressionAttributeNames: { "#name": "Name" },
      ExpressionAttributeValues: { ":VendorName": VendorName },
    };

    const data = await docClient.send(new ScanCommand(params));
    const vendorData = data.Items && data.Items[0];
    if (!vendorData) {
      throw new Error("Vendor data not found");
    }

    const {
      PhoneNumber: VendorPhNo,
      Address: VendorAddress,
      CompanyEmail: VendorEmail,
    } = vendorData.Values;

    console.log(vendorData);

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
    let itemY = 500;

    currentPage.drawText(ReturnStatus, {
      x: 250,
      y: 720,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });

    currentPage.drawText(GatePass, {
      x: 115,
      y: 673,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });
    currentPage.drawText(Issued_Date, {
      x: 305,
      y: 673,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });
    currentPage.drawText(Received_Date, {
      x: 480,
      y: 673,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });
    currentPage.drawText(VendorName, {
      x: 310,
      y: 615,
      size: 9,
      font: timesRomanFontBold,
      color: blackColor,
    });
 
    const maxWidth = 225; // Adjust width as needed
    const fontSize = 9;
    const textLines = splitText(
      VendorAddress,
      maxWidth,
      fontSize,
      timesRomanFontBold
    );

    let yPosition = 600;
    for (const line of textLines) {
      currentPage.drawText(line, {
        x: 310,
        y: yPosition,
        size: fontSize,
        font: timesRomanFontBold,
        color: blackColor,
      });
      yPosition -= 12; // Adjust line spacing as needed
    }

    // Table headers

    const tableHeaders = [
      "SNO",
      "Item Code",
      "Work Order Id",
      "Description",
      "Quantity",
    ];
    const tableXPositions = [25, 60, 200, 300, 480];
    const maxWidthForColumns = [30, 80, 140, 180, 100]; 

    const rowHeight = 25;
    const cellPadding = 5;

    // Draw table headers with padding and borders
    tableHeaders.forEach((header, index) => {
      currentPage.drawText(header, {
        x: tableXPositions[index] + cellPadding,
        y: itemY,
        size: 9,
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
      if (itemY < footerSpace) {
        currentPage = pdfDoc.addPage();
        itemY = 740;
      }

      const rowTextY = itemY;

      // Draw each cell's content with padding
      currentPage.drawText(item.SNO, {
        x: tableXPositions[0] + cellPadding,
        y: rowTextY,
        size: 9,
        font: timesRomanFont,
        color: blackColor,
      });
      currentPage.drawText(item.ItemCode, {
        x: tableXPositions[1] + cellPadding,
        y: rowTextY,
        size: 9,
        font: timesRomanFont,
        color: blackColor,
      });
      currentPage.drawText(item.WorkOrderId, {
        x: tableXPositions[2] + cellPadding,
        y: rowTextY,
        size: 9,
        font: timesRomanFont,
        color: blackColor,
      });

      const maxColumnWidth = 180;
      let lineHeight = 10;
      const descriptionLines = splitText(item.Description, maxWidthForColumns[3], 9, timesRomanFont);
      const maxLinesInRow = Math.max(descriptionLines.length, /* other fields */);
      const dynamicRowHeight = maxLinesInRow * lineHeight + 15;
      
  
      // Draw cell content
      descriptionLines.forEach((line, index) => {
          currentPage.drawText(line, {
              x: tableXPositions[3] + cellPadding ,
              y: rowTextY - index * lineHeight ,
              size: 9,
              font: timesRomanFont,
              color: blackColor,
          });
      });

      // currentPage.drawText(item.Description, {
      //   x: tableXPositions[3] + cellPadding,
      //   y: rowTextY,
      //   size: 9,
      //   font: timesRomanFont,
      //   color: blackColor,
      // });
      currentPage.drawText(item.Quantity, {
        x: tableXPositions[4] + cellPadding,
        y: rowTextY,
        size: 9,
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
            start: { x: xPos, y: rowTextY + dynamicRowHeight - 12  },
            end: { x: xPos, y: rowTextY - dynamicRowHeight + 12 },
            thickness: 1,
            color: blackColor,
          });
        });
        currentPage.drawLine({
          start: {
            x: tableXPositions[tableXPositions.length - 1] + 100,
            y: rowTextY + dynamicRowHeight -12,
          },
          end: {
            x: tableXPositions[tableXPositions.length - 1] + 100,
            y: rowTextY - dynamicRowHeight +12 ,
          },
          thickness: 1,
          color: blackColor,
        });
  

      itemY -= dynamicRowHeight ;
    });

    itemY -= 20;

    // Signature section
    if (itemY - 60 < footerSpace) {
      currentPage = pages[1] || pdfDoc.addPage();
      itemY = 740;
    }
    currentPage.drawText("For Sri Mahalakshmi Engineering Works,", {
      x: 50,
      y: itemY - 60,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });
    currentPage.drawText("Authorized Signature", {
      x: 50,
      y: itemY - 80,
      size: 12,
      font: timesRomanFont,
      color: blackColor,
    });

    currentPage.drawText("Receiver Name and Signature ,", {
      x: 350,
      y: itemY - 60,
      size: 12,
      font: timesRomanFontBold,
      color: blackColor,
    });

    currentPage.drawText("Note: This is Auto computer generated quotation", {
      x: 50,
      y: itemY - 140,
      size: 8,
      font: timesRomanFont,
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
