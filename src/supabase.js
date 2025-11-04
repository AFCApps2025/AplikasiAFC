import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key exists:', !!supabaseKey)

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Prefer': 'return=representation'
    },
    fetch: (url, options = {}) => {
      return fetch(url, {
        ...options,
        // Add retry mechanism
        signal: AbortSignal.timeout(10000), // 10 second timeout
      }).catch(async (error) => {
        console.warn('Supabase fetch failed, retrying...', error);
        // Retry once after 2 seconds
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetch(url, options);
      });
    }
  }
})

// Test connection on load
supabase.from('bookings').select('count').limit(1)
  .then(({ error }) => {
    if (error) {
      console.error('Supabase connection test failed:', error);
      // Show user-friendly error
      if (typeof window !== 'undefined') {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
          position: fixed; top: 10px; right: 10px; z-index: 9999;
          background: #f8d7da; color: #721c24; padding: 10px;
          border-radius: 5px; border: 1px solid #f5c6cb;
          max-width: 300px; font-family: Arial, sans-serif;
        `;
        errorDiv.innerHTML = `
          <strong>⚠️ Koneksi Database Bermasalah</strong><br>
          <small>Coba refresh halaman atau cek koneksi internet</small>
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 10000);
      }
    } else {
      console.log('✅ Supabase connection successful');
    }
  })
  .catch(err => console.error('Connection test error:', err));
