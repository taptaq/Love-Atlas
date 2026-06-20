import { Component, type ErrorInfo, type ReactNode } from 'react';
import { useUiStore } from '../../store';
import { useJourneyStore } from '../../store';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

// 全局错误边界：任一页面运行时抛错时显示降级 UI，避免整个应用白屏
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    useJourneyStore.getState().goToStep('home');
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const language = useUiStore.getState().language;
    const isCn = language === 'cn';
    return (
      <main className="page error-boundary-fallback">
        <span className="step-pill">{isCn ? '出错了' : 'Error'}</span>
        <h1>{isCn ? '页面遇到了问题' : 'Something went wrong'}</h1>
        <p>{isCn ? '可以尝试返回首页重新开始，如果反复出现请刷新页面。' : 'Try returning home to start over. If this keeps happening, please refresh the page.'}</p>
        {this.state.message && <code className="error-detail">{this.state.message}</code>}
        <button className="primary-btn" type="button" onClick={this.handleReset}>
          {isCn ? '返回首页' : 'Back to Home'}
        </button>
      </main>
    );
  }
}
