import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ERROR:", error);
    console.error("STACK:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40 }}>
        <p>⚠️ Diçka shkoi gabim.</p>
        <p>Ju lutemi rifreskoni faqen ose provoni përsëri më vonë.</p>
        <br />          
        <p>Diçka shkoi gabim. Ne po punojmë për ta rregulluar.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;