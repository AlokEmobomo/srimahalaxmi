export const handler = async (event) => {
    console.log(event)
    const allowedOriginPattern = /^https:\/\/([a-zA-Z0-9-]+)\.appshives\.com$/; // Regex to match any subdomain of appshives.com
    const origin = event.headers.origin;
    
    console.log(origin)

    // Check if the origin matches the pattern for appshives.com subdomains
    if (allowedOriginPattern.test(origin)) {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': origin, // Dynamically set the allowed origin
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: JSON.stringify({ message: 'CORS headers set successfully!' }),
        };
    } else {
        return {
            statusCode: 403,
            body: JSON.stringify({ message: 'Forbidden: Invalid origin' }),
        };
    }
};
