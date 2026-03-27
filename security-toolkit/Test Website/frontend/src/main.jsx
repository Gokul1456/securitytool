import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.stack || String(error) }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '16px', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
          Frontend crashed while rendering:
          {'\n'}
          {this.state.message}
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>,
)
