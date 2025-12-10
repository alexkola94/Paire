import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FiShoppingCart, FiPlus, FiEdit, FiTrash2, FiCheck,
  FiSquare, FiCheckSquare, FiPackage, FiList, FiUpload, FiX
} from 'react-icons/fi'
import useCurrencyFormatter from '../hooks/useCurrencyFormatter'
import { shoppingListService } from '../services/api'
import ConfirmationModal from '../components/ConfirmationModal'
import Modal from '../components/Modal'
import CurrencyInput from '../components/CurrencyInput'
import CategorySelector from '../components/CategorySelector'
import FormSection from '../components/FormSection'
import LoadingProgress from '../components/LoadingProgress'
import SuccessAnimation from '../components/SuccessAnimation'
import './ShoppingLists.css'

/**
 * Shopping Lists Page Component
 * Manage shopping lists with items and cost tracking
 */
function ShoppingLists() {
  const { t } = useTranslation()
  const formatCurrency = useCurrencyFormatter()
  const [loading, setLoading] = useState(true)
  const [lists, setLists] = useState([])
  const [selectedList, setSelectedList] = useState(null)
  const [showListForm, setShowListForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteListModal, setDeleteListModal] = useState({ isOpen: false, listId: null })

  const [deleteItemModal, setDeleteItemModal] = useState({ isOpen: false, itemId: null })
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [togglingItems, setTogglingItems] = useState(new Set()) // Track items being toggled to prevent double-tap
  const [swipeState, setSwipeState] = useState({}) // Track swipe gestures per item

  const [listFormData, setListFormData] = useState({
    name: '',
    category: '',
    notes: ''
  })

  const [itemFormData, setItemFormData] = useState({
    name: '',
    quantity: '1',
    unit: '',
    estimatedPrice: '',
    category: '',
    notes: ''
  })

  const categories = [
    { value: 'groceries', label: t('shoppingLists.categories.groceries'), icon: '🛒' },
    { value: 'household', label: t('shoppingLists.categories.household'), icon: '🏠' },
    { value: 'personal', label: t('shoppingLists.categories.personal'), icon: '👤' },
    { value: 'electronics', label: t('shoppingLists.categories.electronics'), icon: '📱' },
    { value: 'clothing', label: t('shoppingLists.categories.clothing'), icon: '👕' },
    { value: 'other', label: t('shoppingLists.categories.other'), icon: '📦' }
  ]

  const units = [
    { value: 'kg', label: 'kg' },
    { value: 'g', label: 'g' },
    { value: 'l', label: 'L' },
    { value: 'ml', label: 'mL' },
    { value: 'pcs', label: t('shoppingLists.units.pieces') },
    { value: 'pack', label: t('shoppingLists.units.pack') },
    { value: 'box', label: t('shoppingLists.units.box') }
  ]

  useEffect(() => {
    loadLists()
  }, [])

  // Add/remove body class when fullscreen is active on mobile
  useEffect(() => {
    const updateBodyClass = () => {
      const isMobile = window.innerWidth <= 768
      if (isMobile && selectedList) {
        document.body.classList.add('shopping-list-fullscreen')
      } else {
        document.body.classList.remove('shopping-list-fullscreen')
      }
    }

    // Initial check
    updateBodyClass()

    // Listen for resize events
    window.addEventListener('resize', updateBodyClass)

    // Cleanup on unmount
    return () => {
      window.removeEventListener('resize', updateBodyClass)
      document.body.classList.remove('shopping-list-fullscreen')
    }
  }, [selectedList])

  const loadLists = async (background = false) => {
    try {
      if (!background) setLoading(true)
      const data = await shoppingListService.getAll()
      // Map snake_case to camelCase
      const mappedLists = (data || []).map(list => ({
        id: list.id,
        name: list.name,
        category: list.category,
        isCompleted: list.is_completed ?? list.isCompleted,
        estimatedTotal: list.estimated_total ?? list.estimatedTotal,
        actualTotal: list.actual_total ?? list.actualTotal,
        notes: list.notes,
        completedDate: list.completed_date ?? list.completedDate,
        createdAt: list.created_at ?? list.createdAt,
        updatedAt: list.updated_at ?? list.updatedAt,
        userProfiles: list.user_profiles ?? list.userProfiles
      }))
      setLists(mappedLists)
    } catch (error) {
      console.error('Error loading shopping lists:', error)
    } finally {
      if (!background) setLoading(false)
    }
  }

  const loadListDetails = async (listId) => {
    try {
      const data = await shoppingListService.getById(listId)
      if (data) {
        // Map snake_case to camelCase
        const mappedList = {
          list: {
            id: data.list.id,
            name: data.list.name,
            category: data.list.category,
            isCompleted: data.list.is_completed ?? data.list.isCompleted,
            estimatedTotal: data.list.estimated_total ?? data.list.estimatedTotal,
            actualTotal: data.list.actual_total ?? data.list.actualTotal,
            notes: data.list.notes,
            completedDate: data.list.completed_date ?? data.list.completedDate
          },
          items: (data.items || []).map(item => ({
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            estimatedPrice: item.estimated_price ?? item.estimatedPrice,
            actualPrice: item.actual_price ?? item.actualPrice,
            isChecked: item.is_checked ?? item.isChecked,
            category: item.category,
            notes: item.notes
          })),
          itemCount: data.itemCount ?? data.item_count ?? 0,
          checkedCount: data.checkedCount ?? data.checked_count ?? 0
        }
        setSelectedList(mappedList)
      }
    } catch (error) {
      console.error('Error loading list details:', error)
    }
  }

  const handleListChange = (e) => {
    const { name, value } = e.target
    setListFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (e) => {
    const { name, value } = e.target
    setItemFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleListSubmit = async (e) => {
    e.preventDefault()
    try {
      // Close form immediately and show loader
      setShowListForm(false)
      setShowLoadingProgress(true)

      if (editingList) {
        await shoppingListService.update(editingList.id, {
          name: listFormData.name,
          category: listFormData.category || null,
          notes: listFormData.notes || null
        })
      } else {
        await shoppingListService.create({
          name: listFormData.name,
          category: listFormData.category || null,
          notes: listFormData.notes || null
        })
      }

      // Background refresh
      await loadLists(true)

      // Success
      setShowLoadingProgress(false)
      setShowSuccessAnimation(true)

      resetListForm()
    } catch (error) {
      console.error('Error saving list:', error)
      setShowLoadingProgress(false)
      setShowListForm(true) // Re-open
      alert(t('shoppingLists.errorSaving'))
    }
  }

  const handleItemSubmit = async (e) => {
    e.preventDefault()
    if (!selectedList) return

    try {
      // Close form immediately and show loader
      setShowItemForm(false)
      setShowLoadingProgress(true)

      const itemData = {
        name: itemFormData.name,
        quantity: parseInt(itemFormData.quantity) || 1,
        unit: itemFormData.unit || null,
        estimatedPrice: itemFormData.estimatedPrice ? parseFloat(itemFormData.estimatedPrice) : null,
        category: itemFormData.category || null,
        notes: itemFormData.notes || null
      }

      if (editingItem) {
        await shoppingListService.updateItem(selectedList.list.id, editingItem.id, itemData)
      } else {
        await shoppingListService.addItem(selectedList.list.id, itemData)
      }

      // We need to refresh the list details. Since loadListDetails manages its own state
      // efficiently (only updates what changed), we can call it.
      // But we need to make sure we don't trigger full page loading if possible.
      // loadListDetails doesn't have a background param but it doesn't set global 'loading' state
      // that hides the whole page, so it's safe-ish.
      await loadListDetails(selectedList.list.id)

      // Success
      setShowLoadingProgress(false)
      setShowSuccessAnimation(true)

      resetItemForm()
    } catch (error) {
      console.error('Error saving item:', error)
      setShowLoadingProgress(false)
      setShowItemForm(true) // Re-open
      alert(t('shoppingLists.errorSavingItem'))
    }
  }

  /**
   * Handle swipe gesture detection for mobile
   * Swipe right to check (if unchecked), swipe left to uncheck (if checked)
   */
  const handleSwipeStart = (itemId, e) => {
    // Only handle swipe on mobile devices (touch events)
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return

    // Don't start swipe if clicking on interactive elements
    if (e.target.closest('button') || e.target.closest('.icon-btn')) return

    // Get current item state
    const item = selectedList?.items.find(i => i.id === itemId)
    if (!item) return

    const touch = e.touches[0]
    setSwipeState(prev => ({
      ...prev,
      [itemId]: {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        isSwiping: false,
        isChecked: item.isChecked
      }
    }))
  }

  const handleSwipeMove = (itemId, e) => {
    // Only handle swipe on mobile devices
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return

    const touch = e.touches[0]
    const swipe = swipeState[itemId]
    if (!swipe) return

    const deltaX = touch.clientX - swipe.startX
    const deltaY = Math.abs(touch.clientY - swipe.startY)
    const absDeltaX = Math.abs(deltaX)

    // Only consider it a swipe if horizontal movement is significantly greater than vertical
    // This prevents accidental triggers during vertical scrolling
    const horizontalDominance = absDeltaX > deltaY * 1.5

    if (absDeltaX > 20 && horizontalDominance) {
      // Determine if swipe direction matches the allowed action
      // Swipe right allowed only if unchecked (to check it)
      // Swipe left allowed only if checked (to uncheck it)
      const swipeRightAllowed = !swipe.isChecked && deltaX > 0
      const swipeLeftAllowed = swipe.isChecked && deltaX < 0

      if (swipeRightAllowed || swipeLeftAllowed) {
        // Prevent default scrolling while actively swiping horizontally
        if (!swipe.isSwiping && absDeltaX > 40) {
          e.preventDefault()
          setSwipeState(prev => ({
            ...prev,
            [itemId]: {
              ...prev[itemId],
              isSwiping: true
            }
          }))
        }

        // Update current position for visual feedback (only if we're actually swiping)
        if (swipe.isSwiping || absDeltaX > 40) {
          setSwipeState(prev => ({
            ...prev,
            [itemId]: {
              ...prev[itemId],
              currentX: touch.clientX,
              isSwiping: true
            }
          }))
        }
      }
    } else if (deltaY > 30) {
      // If vertical movement dominates, cancel swipe detection
      setSwipeState(prev => {
        const next = { ...prev }
        delete next[itemId]
        return next
      })
    }
  }

  const handleSwipeEnd = (itemId, e) => {
    // Only handle swipe on mobile devices
    if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return

    const swipe = swipeState[itemId]
    if (!swipe) {
      return
    }

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - swipe.startX
    const absDeltaX = Math.abs(deltaX)

    // Require minimum 60px swipe distance to prevent accidental toggles
    if (swipe.isSwiping && absDeltaX > 60) {
      // Swipe right to check (if item is unchecked)
      if (!swipe.isChecked && deltaX > 60) {
        handleToggleItem(itemId, e)
      }
      // Swipe left to uncheck (if item is checked)
      else if (swipe.isChecked && deltaX < -60) {
        handleToggleItem(itemId, e)
      }
    }

    // Reset swipe state
    setSwipeState(prev => {
      const next = { ...prev }
      delete next[itemId]
      return next
    })
  }

  const handleToggleItem = async (itemId, event) => {
    if (!selectedList) return

    // Prevent double-tap/double-click
    if (togglingItems.has(itemId)) {
      if (event) {
        event.preventDefault()
        event.stopPropagation()
      }
      return
    }

    // Stop propagation to prevent event bubbling, but don't always prevent default
    // (preventDefault on touch can interfere with scrolling)
    if (event) {
      event.stopPropagation()
      // Only prevent default for touch events on the checkbox itself
      if (event.type === 'touchstart' && event.target.closest('.item-checkbox')) {
        event.preventDefault()
      }
    }

    // Mark item as being toggled
    setTogglingItems(prev => new Set(prev).add(itemId))

    try {
      // Optimistic update - update UI immediately for instant feedback
      const updatedItems = selectedList.items.map(item =>
        item.id === itemId
          ? { ...item, isChecked: !item.isChecked }
          : item
      )

      const checkedCount = updatedItems.filter(item => item.isChecked).length

      // Update state immediately with new checked count
      setSelectedList(prev => ({
        ...prev,
        items: updatedItems,
        checkedCount: checkedCount,
        itemCount: prev.itemCount || prev.items.length
      }))

      // Then update on server
      await shoppingListService.toggleItem(selectedList.list.id, itemId)

      // Reload to ensure sync with server (but don't wait for it to update UI)
      loadListDetails(selectedList.list.id).catch(err => {
        console.error('Error reloading list details:', err)
      })
    } catch (error) {
      console.error('Error toggling item:', error)
      // Revert optimistic update on error by reloading
      try {
        await loadListDetails(selectedList.list.id)
      } catch (reloadError) {
        console.error('Error reloading after toggle failure:', reloadError)
      }
    } finally {
      // Remove from toggling set after a short delay to allow for rapid successive taps
      setTimeout(() => {
        setTogglingItems(prev => {
          const next = new Set(prev)
          next.delete(itemId)
          return next
        })
      }, 300)
    }
  }

  /**
   * Open delete list confirmation modal
   */
  const openDeleteListModal = (listId) => {
    setDeleteListModal({ isOpen: true, listId })
  }

  /**
   * Close delete list confirmation modal
   */
  const closeDeleteListModal = () => {
    setDeleteListModal({ isOpen: false, listId: null })
  }

  /**
   * Handle deleting list
   */
  const handleDeleteList = async () => {
    const { listId } = deleteListModal
    if (!listId) return

    try {
      await shoppingListService.delete(listId)
      await loadLists()
      if (selectedList?.list.id === listId) {
        setSelectedList(null)
      }
      closeDeleteListModal()
    } catch (error) {
      console.error('Error deleting list:', error)
      alert(t('shoppingLists.errorDeleting'))
    }
  }

  /**
   * Open delete item confirmation modal
   */
  const openDeleteItemModal = (itemId) => {
    setDeleteItemModal({ isOpen: true, itemId })
  }

  /**
   * Close delete item confirmation modal
   */
  const closeDeleteItemModal = () => {
    setDeleteItemModal({ isOpen: false, itemId: null })
  }

  /**
   * Handle deleting item
   */
  const handleDeleteItem = async () => {
    const { itemId } = deleteItemModal
    if (!selectedList || !itemId) return

    try {
      await shoppingListService.deleteItem(selectedList.list.id, itemId)
      await loadListDetails(selectedList.list.id)
      closeDeleteItemModal()
    } catch (error) {
      console.error('Error deleting item:', error)
      alert(t('shoppingLists.errorDeletingItem'))
    }
  }

  const handleCompleteList = async (listId) => {
    try {
      await shoppingListService.complete(listId)
      await loadLists()
      setSelectedList(null)
    } catch (error) {
      console.error('Error completing list:', error)
      alert(t('shoppingLists.errorCompleting'))
    }
  }

  const resetListForm = () => {
    setShowListForm(false)
    setEditingList(null)
    setListFormData({ name: '', category: '', notes: '' })
  }

  const resetItemForm = () => {
    setShowItemForm(false)
    setEditingItem(null)
    setItemFormData({ name: '', quantity: '1', unit: '', estimatedPrice: '', category: '', notes: '' })
  }

  const handleEditList = (list) => {
    setEditingList(list)
    setListFormData({
      name: list.name,
      category: list.category || '',
      notes: list.notes || ''
    })
    setShowListForm(true)
  }

  const handleEditItem = (item) => {
    setEditingItem(item)
    setItemFormData({
      name: item.name,
      quantity: item.quantity?.toString() || '1',
      unit: item.unit || '',
      estimatedPrice: (item.estimatedPrice ?? item.estimated_price)?.toString() || '',
      category: item.category || '',
      notes: item.notes || ''
    })
    setShowItemForm(true)
  }

  /**
   * Parse uploaded file content
   * Supports: plain text (one item per line), CSV, JSON
   */
  const parseFileContent = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const content = e.target.result
          const fileName = file.name.toLowerCase()
          let items = []

          // Check file type
          if (fileName.endsWith('.json')) {
            // Parse JSON format
            const data = JSON.parse(content)
            if (Array.isArray(data)) {
              items = data.map(item => ({
                name: item.name || item.item || item.text || '',
                quantity: item.quantity || item.qty || 1,
                unit: item.unit || '',
                estimatedPrice: item.price || item.estimatedPrice || item.cost || null,
                category: item.category || '',
                notes: item.notes || item.note || ''
              }))
            } else if (data.items && Array.isArray(data.items)) {
              items = data.items.map(item => ({
                name: item.name || item.item || item.text || '',
                quantity: item.quantity || item.qty || 1,
                unit: item.unit || '',
                estimatedPrice: item.price || item.estimatedPrice || item.cost || null,
                category: item.category || '',
                notes: item.notes || item.note || ''
              }))
            }
          } else if (fileName.endsWith('.csv')) {
            // Parse CSV format
            const lines = content.split('\n').filter(line => line.trim())
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(',').map(v => v.trim())
              const item = {}

              headers.forEach((header, index) => {
                item[header] = values[index] || ''
              })

              items.push({
                name: item.name || item.item || item.text || values[0] || '',
                quantity: parseInt(item.quantity || item.qty || values[1] || '1') || 1,
                unit: item.unit || values[2] || '',
                estimatedPrice: parseFloat(item.price || item.cost || item.estimatedprice || values[3] || '0') || null,
                category: item.category || '',
                notes: item.notes || item.note || ''
              })
            }
          } else {
            // Parse plain text (one item per line)
            const lines = content.split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0)

            items = lines.map((line, index) => {
              // Try to parse: "Item Name, Quantity, Unit, Price"
              const parts = line.split(',').map(p => p.trim())

              return {
                name: parts[0] || line,
                quantity: parseInt(parts[1]) || 1,
                unit: parts[2] || '',
                estimatedPrice: parseFloat(parts[3]) || null,
                category: '',
                notes: ''
              }
            })
          }

          // Filter out items with empty names
          items = items.filter(item => item.name && item.name.length > 0)

          if (items.length === 0) {
            reject(new Error('No valid items found in file'))
            return
          }

          resolve(items)
        } catch (error) {
          reject(new Error(`Error parsing file: ${error.message}`))
        }
      }

      reader.onerror = () => {
        reject(new Error('Error reading file'))
      }

      // Read as text
      reader.readAsText(file)
    })
  }

  /**
   * Handle file upload and create shopping list
   */
  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      setUploading(true)

      // Parse file content
      const items = await parseFileContent(file)

      // Create list name from file name (remove extension)
      const listName = file.name.replace(/\.[^/.]+$/, '') || 'Imported List'

      // Create the shopping list
      const newList = await shoppingListService.create({
        name: listName,
        category: null,
        notes: `Imported from ${file.name}`
      })

      // Add all items to the list
      for (const item of items) {
        try {
          await shoppingListService.addItem(newList.id, {
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || null,
            estimatedPrice: item.estimatedPrice || null,
            category: item.category || null,
            notes: item.notes || null
          })
        } catch (itemError) {
          console.error(`Error adding item "${item.name}":`, itemError)
          // Continue with other items even if one fails
        }
      }

      // Reload lists and select the new list
      await loadLists()
      await loadListDetails(newList.id)

      alert(t('shoppingLists.uploadSuccess', { count: items.length, fileName: file.name }))
    } catch (error) {
      console.error('Error uploading file:', error)
      alert(t('shoppingLists.uploadError', { error: error.message }))
    } finally {
      setUploading(false)
      // Reset file input
      e.target.value = ''
    }
  }

  if (loading) {
    return <div className="loading">{t('common.loading')}</div>
  }

  const activeLists = lists.filter(l => !l.isCompleted)
  const completedLists = lists.filter(l => l.isCompleted)

  return (
    <div className="shopping-lists-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <FiShoppingCart className="page-icon" />
            {t('shoppingLists.title')}
          </h1>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0 }}>
              <input
                type="file"
                accept=".txt,.csv,.json"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <FiUpload />
              {uploading ? t('shoppingLists.uploading') : t('shoppingLists.uploadList')}
            </label>
            <button className="btn btn-primary" onClick={() => setShowListForm(true)}>
              <FiPlus /> {t('shoppingLists.newList')}
            </button>
          </div>
        </div>
      </div>

      <div className="shopping-content">
        {/* Lists Sidebar */}
        <div className={`lists-sidebar ${showSidebar ? 'mobile-open' : ''} ${selectedList ? 'hidden-on-mobile' : ''}`}>
          <div className="lists-section">
            <h3>{t('shoppingLists.activeLists')} ({activeLists.length})</h3>
            {activeLists.length === 0 ? (
              <div className="empty-sidebar">
                <FiList size={32} />
                <p>{t('shoppingLists.noActiveLists')}</p>
                <button className="btn btn-sm btn-primary" onClick={() => setShowListForm(true)}>
                  <FiPlus /> {t('shoppingLists.createList')}
                </button>
              </div>
            ) : (
              <div className="lists-grid">
                {activeLists.map(list => (
                  <div
                    key={list.id}
                    className={`list-card ${selectedList?.list.id === list.id ? 'selected' : ''}`}
                    onClick={() => {
                      // Toggle: if already selected, deselect it; otherwise, select it
                      if (selectedList?.list.id === list.id) {
                        setSelectedList(null)
                      } else {
                        loadListDetails(list.id)
                      }
                      setShowSidebar(false)
                    }}
                  >
                    <div className="list-card-header">
                      <div className="list-title-section">
                        <h4>{list.name}</h4>
                        {list.userProfiles && (
                          <div className="list-added-by">
                            {t('shoppingLists.addedBy')} {list.userProfiles.display_name || list.userProfiles.displayName}
                          </div>
                        )}
                      </div>
                      <div className="list-actions">
                        <button
                          className="icon-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditList(list)
                          }}
                        >
                          <FiEdit />
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={(e) => {
                            e.stopPropagation()
                            openDeleteListModal(list.id)
                          }}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    {list.estimatedTotal && (
                      <div className="list-estimate">
                        <span style={{ fontSize: '14px', fontWeight: 'bold', marginRight: '4px' }}>€</span>
                        <span>{formatCurrency(list.estimatedTotal)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {completedLists.length > 0 && (
            <div className="lists-section completed-section">
              <h3>{t('shoppingLists.completedLists')} ({completedLists.length})</h3>
              <div className="lists-grid">
                {completedLists.map(list => (
                  <div
                    key={list.id}
                    className="list-card completed"
                    onClick={() => {
                      // Toggle: if already selected, deselect it; otherwise, select it
                      if (selectedList?.list.id === list.id) {
                        setSelectedList(null)
                      } else {
                        loadListDetails(list.id)
                      }
                    }}
                  >
                    <div className="list-card-header">
                      <h4>{list.name}</h4>
                      <FiCheckSquare className="completed-icon" />
                    </div>
                    {list.actualTotal && (
                      <div className="list-actual">
                        <span>{formatCurrency(list.actualTotal)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Items Panel */}
        <div className={`items-panel ${selectedList ? 'mobile-fullscreen' : ''}`}>
          {selectedList ? (
            <>
              <div className="items-header sticky-header">
                <div className="header-main">
                  <h2>{selectedList.list.name}</h2>
                  <div className="items-stats">
                    <span className="progress-badge">
                      {selectedList.checkedCount} / {selectedList.itemCount} {t('shoppingLists.items')}
                    </span>
                    {selectedList.list.estimatedTotal && (
                      <span className="estimate">
                        {t('shoppingLists.estimated')}: {formatCurrency(selectedList.list.estimatedTotal)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="header-actions">
                  <button
                    className="mobile-close-btn"
                    onClick={() => {
                      setSelectedList(null)
                      setShowSidebar(false)
                    }}
                    aria-label={t('common.close')}
                    title={t('common.back')}
                  >
                    <FiX />
                  </button>
                </div>
              </div>

              <div className="items-actions-bar">
                <button className="btn btn-sm btn-primary" onClick={() => setShowItemForm(true)}>
                  <FiPlus /> {t('shoppingLists.addItem')}
                </button>
                {!selectedList.list.isCompleted && selectedList.items.length > 0 && (
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => handleCompleteList(selectedList.list.id)}
                  >
                    <FiCheck /> {t('shoppingLists.completeList')}
                  </button>
                )}
              </div>

              <div className="items-list" key={`list-${selectedList.list.id}`}>
                {selectedList.items.length === 0 ? (
                  <div className="empty-items">
                    <FiPackage size={48} />
                    <h3>{t('shoppingLists.noItems')}</h3>
                    <p>{t('shoppingLists.noItemsDescription')}</p>
                    <button className="btn btn-primary" onClick={() => setShowItemForm(true)}>
                      <FiPlus /> {t('shoppingLists.addFirstItem')}
                    </button>
                  </div>
                ) : (
                  selectedList.items.map((item, index) => {
                    const swipe = swipeState[item.id] || {}
                    const swipeOffset = swipe.isSwiping ? (swipe.currentX - swipe.startX) : 0
                    // Determine swipe direction for styling
                    const isSwipeRight = swipeOffset > 0 && !swipe.isChecked
                    const isSwipeLeft = swipeOffset < 0 && swipe.isChecked
                    // Calculate swipe progress for animation (0-100%)
                    const swipeProgress = isSwipeRight
                      ? Math.min(100, (swipeOffset / 80) * 100)
                      : isSwipeLeft
                        ? Math.min(100, (Math.abs(swipeOffset) / 80) * 100)
                        : 0

                    return (
                      <div
                        key={item.id}
                        className={`item-card ${item.isChecked ? 'checked' : ''} ${swipe.isSwiping ? 'swiping' : ''} ${isSwipeRight ? 'swipe-right' : ''} ${isSwipeLeft ? 'swipe-left' : ''}`}
                        onTouchStart={(e) => {
                          // Don't interfere with checkbox touch events
                          if (!e.target.closest('.item-checkbox')) {
                            handleSwipeStart(item.id, e)
                          }
                        }}
                        onTouchMove={(e) => {
                          if (!e.target.closest('.item-checkbox')) {
                            handleSwipeMove(item.id, e)
                          }
                        }}
                        onTouchEnd={(e) => {
                          if (!e.target.closest('.item-checkbox')) {
                            handleSwipeEnd(item.id, e)
                          }
                        }}
                        style={{
                          transform: swipe.isSwiping ? `translateX(${swipeOffset}px)` : 'none',
                          transition: swipe.isSwiping ? 'none' : 'transform 0.3s ease-out'
                        }}
                      >
                        {/* Swipe action indicator - appears on the left when swiping right to check */}
                        {isSwipeRight && (
                          <div
                            className="swipe-indicator swipe-check-indicator"
                            style={{
                              opacity: Math.min(1, swipeProgress / 50), // Show earlier
                              transform: `translate(${-swipeOffset + 16}px, -50%) scale(${Math.min(1, swipeProgress / 60)})`,
                              left: 0
                            }}
                          >
                            <FiCheck size={24} />
                          </div>
                        )}

                        {/* Swipe action indicator - appears on the right when swiping left to uncheck */}
                        {isSwipeLeft && (
                          <div
                            className="swipe-indicator swipe-uncheck-indicator"
                            style={{
                              opacity: Math.min(1, swipeProgress / 50), // Show earlier
                              transform: `translate(${-swipeOffset - 16}px, -50%) scale(${Math.min(1, swipeProgress / 60)})`,
                              right: 0
                            }}
                          >
                            <FiX size={24} />
                          </div>
                        )}
                        <div
                          className="item-checkbox"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleItem(item.id, e)
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            handleToggleItem(item.id, e)
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={item.isChecked ? t('shoppingLists.uncheckItem') : t('shoppingLists.checkItem')}
                        >
                          {item.isChecked ? <FiCheckSquare size={28} /> : <FiSquare size={28} />}
                        </div>

                        <div className="item-content">
                          <div className="item-main">
                            <h4>{item.name}</h4>
                            <span className="item-quantity">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                          {item.estimatedPrice && (
                            <div className="item-price">
                              {formatCurrency(item.estimatedPrice * item.quantity)}
                            </div>
                          )}
                          {item.notes && (
                            <div className="item-notes">{item.notes}</div>
                          )}
                        </div>

                        <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="icon-btn"
                            onClick={() => handleEditItem(item)}
                            aria-label={t('common.edit')}
                          >
                            <FiEdit />
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => openDeleteItemModal(item.id)}
                            aria-label={t('common.delete')}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <div className="empty-selection">
              {activeLists.length > 0 ? (
                <>
                  <FiShoppingCart size={64} />
                  <h3>{t('shoppingLists.selectList')}</h3>
                  <p>{t('shoppingLists.selectListDescription')}</p>
                  <div className="mobile-lists-preview">
                    <h4>{t('shoppingLists.activeLists')} ({activeLists.length})</h4>
                    <div className="mobile-lists-grid">
                      {activeLists.map(list => (
                        <div
                          key={list.id}
                          className="mobile-list-card"
                          onClick={() => {
                            // Toggle: if already selected, deselect it; otherwise, select it
                            if (selectedList?.list.id === list.id) {
                              setSelectedList(null)
                            } else {
                              loadListDetails(list.id)
                            }
                            setShowSidebar(false)
                          }}
                        >
                          <h5>{list.name}</h5>
                          {list.estimatedTotal && (
                            <div className="mobile-list-estimate">
                              {formatCurrency(list.estimatedTotal)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <FiShoppingCart size={64} />
                  <h3>{t('shoppingLists.selectList')}</h3>
                  <p>{t('shoppingLists.selectListDescription')}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* List Form Modal (Portal) */}
      <Modal
        isOpen={showListForm}
        onClose={resetListForm}
        title={editingList ? t('shoppingLists.editList') : t('shoppingLists.newList')}
      >
        <form onSubmit={handleListSubmit}>
          <FormSection title={t('transaction.formSections.basicInfo')}>
            <div className="form-group">
              <label>{t('shoppingLists.listName')} *</label>
              <input
                type="text"
                name="name"
                value={listFormData.name}
                onChange={handleListChange}
                required
                placeholder={t('shoppingLists.listNamePlaceholder')}
              />
            </div>

            {/* Category - Full width for better visibility */}
            <div className="form-layout-item-full">
              <CategorySelector
                value={listFormData.category}
                onChange={handleListChange}
                name="category"
                categories={categories.map(c => c.value)}
                type="expense"
                label={t('shoppingLists.category')}
              />
            </div>
          </FormSection>

          <FormSection title={t('transaction.formSections.additionalDetails')} collapsible={true} defaultExpanded={!!listFormData.notes}>
            <div className="form-group">
              <label>{t('shoppingLists.notes')}</label>
              <textarea
                name="notes"
                value={listFormData.notes}
                onChange={handleListChange}
                rows="3"
                placeholder={t('shoppingLists.notesPlaceholder')}
              />
            </div>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={resetListForm}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {editingList ? t('common.update') : t('common.create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Item Form Modal (Portal) */}
      <Modal
        isOpen={showItemForm}
        onClose={resetItemForm}
        title={editingItem ? t('shoppingLists.editItem') : t('shoppingLists.addItem')}
      >
        <form onSubmit={handleItemSubmit}>
          {/* Basic Information Section */}
          <FormSection title={t('transaction.formSections.basicInfo')}>
            <div className="form-group">
              <label>{t('shoppingLists.itemName')} *</label>
              <input
                type="text"
                name="name"
                value={itemFormData.name}
                onChange={handleItemChange}
                required
                placeholder={t('shoppingLists.itemNamePlaceholder')}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{t('shoppingLists.quantity')} *</label>
                <input
                  type="number"
                  name="quantity"
                  value={itemFormData.quantity}
                  onChange={handleItemChange}
                  required
                  min="1"
                  step="1"
                />
              </div>

              <div className="form-group">
                <label>{t('shoppingLists.unit')}</label>
                <select name="unit" value={itemFormData.unit} onChange={handleItemChange}>
                  <option value="">{t('shoppingLists.selectUnit')}</option>
                  {units.map(unit => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <CurrencyInput
              value={itemFormData.estimatedPrice}
              onChange={handleItemChange}
              name="estimatedPrice"
              id="estimatedPrice"
              label={t('shoppingLists.estimatedPrice')}
              quickAmounts={[]}
            />
            <small>{t('shoppingLists.priceHint')}</small>

            {/* Category - Full width for better visibility */}
            <div className="form-layout-item-full">
              <CategorySelector
                value={itemFormData.category}
                onChange={handleItemChange}
                name="category"
                categories={categories.map(c => c.value)}
                type="expense"
                label={t('shoppingLists.category')}
              />
            </div>
          </FormSection>

          {/* Additional Details Section */}
          <FormSection title={t('transaction.formSections.additionalDetails')} collapsible={true} defaultExpanded={!!itemFormData.notes}>
            <div className="form-group">
              <label>{t('shoppingLists.notes')}</label>
              <textarea
                name="notes"
                value={itemFormData.notes}
                onChange={handleItemChange}
                rows="2"
                placeholder={t('shoppingLists.itemNotesPlaceholder')}
              />
            </div>
          </FormSection>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={resetItemForm}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              {editingItem ? t('common.update') : t('common.add')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete List Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteListModal.isOpen}
        onClose={closeDeleteListModal}
        onConfirm={handleDeleteList}
        title={t('shoppingLists.deleteList')}
        message={t('shoppingLists.confirmDeleteList')}
        confirmText={t('common.delete')}
        variant="danger"
      />

      {/* Delete Item Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteItemModal.isOpen}
        onClose={closeDeleteItemModal}
        onConfirm={handleDeleteItem}
        title={t('shoppingLists.deleteItem')}
        message={t('shoppingLists.confirmDeleteItem')}
        confirmText={t('common.delete')}
        variant="danger"
      />

      {/* Loading Progress Overlay */}
      <LoadingProgress show={showLoadingProgress} />

      {/* Success Animation */}
      <SuccessAnimation
        show={showSuccessAnimation}
        onComplete={() => setShowSuccessAnimation(false)}
        message={t('common.savedSuccess')}
      />
    </div>
  )
}

export default ShoppingLists

