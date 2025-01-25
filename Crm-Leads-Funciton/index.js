const axios = require('axios');

// Replace with your actual values
const VERIFY_TOKEN = 'your_verify_token'; // Your verification token
const PAGE_ACCESS_TOKEN = 'EAASNcsTtHXABO4NfUCfQdslVf4V8SnZBhaun7BJaaMZBd1eoZChFNgW0m6i4jkS4jJtr9CkdC8P2CTpBi22dIU0OhFzyKqwfRR33egt2TnB5HWMRJ8mAQOLy2pnsyFydQQB0P0i0kThsa5GqaZCPLBv6a78DzqG6qrIWooMUCQKV95Jrnj1uOhUzDGRLpVoLLHC8e7dGWL3zdBAwO2ZAgQqTZCiAZDZD'; // Your page access token

exports.handler = async (event) => {
  const { queryStringParameters, body } = event;
  const httpMethod = event.httpMethod || event.requestContext.http.method;

  // Log the incoming event for debugging
  console.log("Received event:", JSON.stringify(event, null, 2));

  if (httpMethod === 'GET') {
    const mode = queryStringParameters['hub.mode'];
    const token = queryStringParameters['hub.verify_token'];
    const challenge = queryStringParameters['hub.challenge'];

    console.log("GET Request - Query Parameters:", queryStringParameters);

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('Webhook verified');
      return {
        statusCode: 200,
        body: challenge,
      };
    }
    return {
      statusCode: 403,
      body: 'Forbidden',
    };
  }
  
  else if (httpMethod === 'POST') {
    // Log the incoming POST body
    console.log("POST Request - Body:", body);

    const parsedBody = JSON.parse(body);

    // Check if the event is related to page and leadgen
    if (parsedBody.object === 'page') {
      for (const entry of parsedBody.entry) {
        const changes = entry.changes;

        // Process leadgen changes
        for (const change of changes) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            const formId = change.value.form_id;
            const pageId = change.value.page_id;

            console.log(`New lead generated. Leadgen ID: ${leadgenId}, Form ID: ${formId}, Page ID: ${pageId}`);
            
            // Fetch additional lead details from Facebook Graph API
            try {
              const leadDetails = await fetchLeadDetails(leadgenId);
              console.log('Lead Details:', leadDetails);
            } catch (error) {
              console.error('Error fetching lead details:', error.message);
              return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Error fetching lead details' }),
              };
            }
          }
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Event Received' }),
      };
    } else {
      return {
        statusCode: 400,
        body: 'Invalid Event',
      };
    }
  } else {
    // Method Not Allowed for other HTTP methods
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }
};

// Function to fetch lead details from Facebook Graph API
async function fetchLeadDetails(leadgenId) {
  const url = `https://graph.facebook.com/v16.0/${leadgenId}`;
  try {
    const response = await axios.get(url, {
      params: {
        access_token: PAGE_ACCESS_TOKEN,
      },
    });

    if (!response.data) {
      throw new Error('No data returned from Facebook API');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching data from Facebook API:', error.message);
    throw error;
  }
}
