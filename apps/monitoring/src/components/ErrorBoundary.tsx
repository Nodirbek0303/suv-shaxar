import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#F4F7FB',
          }}
        >
          <div
            style={{
              maxWidth: 480,
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              border: '1px solid #e2e8f0',
            }}
          >
            <h1 style={{ margin: 0, color: '#003087', fontSize: 18 }}>
              Sahifa yuklanmadi
            </h1>
            <p style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              style={{
                marginTop: 16,
                background: '#003087',
                color: '#fff',
                border: 0,
                borderRadius: 8,
                padding: '10px 16px',
                cursor: 'pointer',
              }}
            >
              Qayta kirish
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
