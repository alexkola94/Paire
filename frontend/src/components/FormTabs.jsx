import { Children, cloneElement, isValidElement } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import './FormTabs.css'

function FormTabPanel({ id, activeTab, children }) {
  if (id !== activeTab) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        className="form-tabs-panel"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

function FormTabsBar({ tabs = [], activeTab, onTabChange }) {
  return (
    <div className="form-tabs-bar" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`form-tabs-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon && <span className="form-tabs-btn-icon">{tab.icon}</span>}
          <span className="form-tabs-btn-label">{tab.label}</span>
        </button>
      ))}
    </div>
  )
}

function FormTabsContent({ activeTab, children }) {
  const panelContent = Children.map(children, (child) => {
    if (isValidElement(child) && child.type === FormTabPanel) {
      return cloneElement(child, { activeTab })
    }
    return child
  })
  return <div className="form-tabs-content">{panelContent}</div>
}

function FormTabs({
  tabs = [],
  activeTab,
  onTabChange,
  children,
  className = ''
}) {
  const panelContent = Children.map(children, (child) => {
    if (isValidElement(child) && child.type === FormTabPanel) {
      return cloneElement(child, { activeTab })
    }
    return child
  })

  return (
    <div className={`form-tabs ${className}`}>
      <FormTabsBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
      <div className="form-tabs-content">
        {panelContent}
      </div>
    </div>
  )
}

FormTabs.Panel = FormTabPanel
FormTabs.Bar = FormTabsBar
FormTabs.Content = FormTabsContent

export default FormTabs
