import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-right font-sans" dir="rtl">
          <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 md:p-12 space-y-8">
            <div className="w-24 h-24 bg-red-100 rounded-3xl flex items-center justify-center mx-auto text-red-600 shadow-inner">
              <AlertTriangle size={48} />
            </div>
            
            <div className="text-center space-y-4">
              <h1 className="text-3xl font-black text-slate-900">عذراً، حدث خطأ غير متوقع</h1>
              <p className="text-slate-500 text-lg leading-relaxed max-w-md mx-auto">
                واجه التطبيق مشكلة تقنية أدت إلى توقفه المفاجئ. لا تقلق، بياناتك في أمان.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-slate-900 rounded-2xl p-6 overflow-auto max-h-64 text-left dir-ltr">
                <p className="text-red-400 font-mono text-sm mb-2 font-bold">{this.state.error.toString()}</p>
                <pre className="text-slate-400 font-mono text-xs whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-3 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95"
              >
                <RefreshCw size={20} />
                إعادة تشغيل التطبيق
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-3 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
              >
                <Home size={20} />
                العودة للرئيسية
              </button>
            </div>

            <div className="pt-6 border-t border-slate-100 text-center">
              <p className="text-slate-400 text-sm">
                إذا استمرت المشكلة، يرجى تصوير الشاشة وإرسالها للمطور.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
