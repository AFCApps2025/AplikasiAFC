/**
 * Direct insert to Supabase bypassing all RLS and response parsing
 * This is a workaround for error 21000 "more than one row returned"
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function directInsertWorkReport(reportData) {
  try {
    // Tidak request response data untuk avoid error 21000
    const response = await fetch(`${SUPABASE_URL}/rest/v1/work_reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal'  // Tidak return data
      },
      body: JSON.stringify(reportData)
    });

    // Status 201 Created adalah success
    if (response.status === 201 || response.status === 200 || response.status === 204) {
      console.log('✅ Direct insert successful');
      return { success: true, error: null };
    }

    // Jika error, log detail
    const errorText = await response.text();
    console.error('Direct insert failed:', {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    });
    
    return { 
      success: false, 
      error: new Error(`Insert failed: ${response.status} - ${errorText}`)
    };
  } catch (error) {
    console.error('❌ Direct insert error:', error);
    return { success: false, error };
  }
}
