import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  declare props: Readonly<Props>;
  declare setState: Component<Props, State>['setState'];

  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
    showDetails: false,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
      showDetails: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  resetBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: false,
    });
  };

  copyErrorDetails = async () => {
    const errorMessage = this.state.error?.message || 'Unknown error';
    const stack = this.state.error?.stack || 'No stack trace available';
    const componentStack =
      this.state.errorInfo?.componentStack || 'No component stack available';
    const details = [
      'ParkWise Error Report',
      `Time: ${new Date().toISOString()}`,
      `Message: ${errorMessage}`,
      `Stack: ${stack}`,
      `Component Stack: ${componentStack}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });
    } catch (copyError) {
      console.error('Failed to copy error details:', copyError);
      this.setState({ copied: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          <h2>Application Error</h2>
          <p>{this.state.error?.message || 'Something went wrong.'}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={this.resetBoundary}>Try Again</button>
            <button onClick={() => window.location.reload()}>Reload Application</button>
            <button onClick={() => this.setState({ showDetails: !this.state.showDetails })}>
              {this.state.showDetails ? 'Hide Error Details' : 'Show Error Details'}
            </button>
            <button onClick={this.copyErrorDetails}>
              {this.state.copied ? 'Copied!' : 'Copy Error Details'}
            </button>
          </div>
          {this.state.showDetails && (
            <pre
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                background: '#111827',
                color: '#f9fafb',
                borderRadius: 6,
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
              }}
            >
              {this.state.error?.stack || 'No stack trace available.'}
              {'\n\n'}
              {this.state.errorInfo?.componentStack || 'No component stack available.'}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
