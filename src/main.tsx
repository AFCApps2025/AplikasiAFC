import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add error boundary for better error handling
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center', 
          fontFamily: 'Arial, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 50%, #fff7ed 100%)'
        }}>
          <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Terjadi Kesalahan</h2>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            Silakan refresh halaman atau hubungi administrator.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Refresh Halaman
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Add app-loaded class when React mounts
document.body.classList.add('app-loaded');

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)
