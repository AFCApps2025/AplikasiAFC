import { syncFromGoogleSheets, SheetsDataRow } from '@/api/sheets-sync';

// Simple server for handling API requests
export const createAPIServer = () => {
  const handleRequest = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    
    // Handle CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    // Handle sheets sync endpoint
    if (url.pathname === '/api/sheets-sync' && req.method === 'POST') {
      try {
        const { data } = await req.json() as { data: SheetsDataRow[] };
        
        if (!Array.isArray(data)) {
          return new Response(JSON.stringify({
            success: false,
            message: 'Invalid data format',
            processed: 0,
            errors: ['Data must be an array']
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const result = await syncFromGoogleSheets(data);
        
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          message: `API handler error: ${error}`,
          processed: 0,
          errors: [`Handler error: ${error}`]
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Default 404
    return new Response('Not Found', { 
      status: 404, 
      headers: corsHeaders 
    });
  };

  return { handleRequest };
};

// For development - simple server setup
if (typeof window === 'undefined' && typeof global !== 'undefined') {
  const server = createAPIServer();
  
  // Export for potential use with Node.js server
  (global as any).apiHandler = server.handleRequest;
}
