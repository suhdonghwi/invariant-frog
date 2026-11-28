import { Component, type ReactNode } from 'react';
import { Aborted } from '../director/sequence';

interface Props {
  fallback: (error: unknown) => ReactNode;
  children: ReactNode;
}

export class ErrorBoundary extends Component<Props, { failed: boolean; error: unknown }> {
  state = { failed: false, error: null as unknown };

  static getDerivedStateFromError(error: unknown) {
    return { failed: true, error };
  }

  private onRejection = (e: PromiseRejectionEvent) => {
    if (e.reason instanceof Aborted) {
      e.preventDefault();
      return;
    }
    console.error(e.reason);
    this.setState({ failed: true, error: e.reason });
  };

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.onRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.onRejection);
  }

  render() {
    return this.state.failed ? this.props.fallback(this.state.error) : this.props.children;
  }
}
