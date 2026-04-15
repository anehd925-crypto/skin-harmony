import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <span className="text-3xl">😔</span>
          </div>
          <h1 className="mb-2 text-lg font-bold text-foreground">일시적인 오류가 발생했어요</h1>
          <p className="mb-6 text-sm text-muted-foreground leading-relaxed">
            예상치 못한 문제가 발생했습니다.<br />홈으로 돌아가서 다시 시도해주세요.
          </p>
          <button
            onClick={this.handleReset}
            className="rounded-2xl gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-primary"
          >
            홈으로 돌아가기
          </button>
          {process.env.NODE_ENV === 'development' && this.state.errorMessage && (
            <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground font-mono max-w-sm break-all">
              {this.state.errorMessage}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
