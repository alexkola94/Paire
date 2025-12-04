import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FiShoppingCart, FiPlus, FiEdit, FiTrash2, FiCheck, 
  FiSquare, FiCheckSquare, FiDollarSign, FiPackage, FiList
} from 'react-icons/fi'
import { formatCurrency } from '../utils/formatCurrency'
import './ShoppingLists.css'

/**
 * Shopping Lists Page Component
 * Manage shopping lists with items and cost tracking
 */
function ShoppingLists() {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [lists, setLists] = useState([])
  const [selectedList, setSelectedList] = useState(null)
  const [showListForm, setShowListForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingList, setEditingList] = useState(null)
  const [editingItem, setEditingItem] = useState(null)
  
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

  const loadLists = async () => {
    try {
      setLoading(true)
      // TODO: Implement API call
      // const data = await shoppingListService.getAll()
      // setLists(data || [])
      setLists([]) // Placeholder
    } catch (error) {
      console.error('Error loading shopping lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadListDetails = async (listId) => {
    try {
      // TODO: Implement API call
      // const data = await shoppingListService.getById(listId)
      // setSelectedList(data)
      console.log('Load list:', listId)
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
      if (editingList) {
        // TODO: Update list
        console.log('Update list:', listFormData)
      } else {
        // TODO: Create list
        console.log('Create list:', listFormData)
      }
      await loadLists()
      resetListForm()
    } catch (error) {
      console.error('Error saving list:', error)
      alert(t('shoppingLists.errorSaving'))
    }
  }

  const handleItemSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        // TODO: Update item
        console.log('Update item:', itemFormData)
      } else {
        // TODO: Add item
        console.log('Add item:', itemFormData)
      }
      await loadListDetails(selectedList.list.id)
      resetItemForm()
    } catch (error) {
      console.error('Error saving item:', error)
      alert(t('shoppingLists.errorSavingItem'))
    }
  }

  const handleToggleItem = async (itemId) => {
    try {
      // TODO: Toggle item checked status
      console.log('Toggle item:', itemId)
      await loadListDetails(selectedList.list.id)
    } catch (error) {
      console.error('Error toggling item:', error)
    }
  }

  const handleDeleteList = async (listId) => {
    if (!confirm(t('shoppingLists.confirmDeleteList'))) return
    try {
      // TODO: Delete list
      console.log('Delete list:', listId)
      await loadLists()
      if (selectedList?.list.id === listId) {
        setSelectedList(null)
      }
    } catch (error) {
      console.error('Error deleting list:', error)
    }
  }

  const handleDeleteItem = async (itemId) => {
    if (!confirm(t('shoppingLists.confirmDeleteItem'))) return
    try {
      // TODO: Delete item
      console.log('Delete item:', itemId)
      await loadListDetails(selectedList.list.id)
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleCompleteList = async (listId) => {
    try {
      // TODO: Mark list as complete
      console.log('Complete list:', listId)
      await loadLists()
      setSelectedList(null)
    } catch (error) {
      console.error('Error completing list:', error)
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
      quantity: item.quantity.toString(),
      unit: item.unit || '',
      estimatedPrice: item.estimatedPrice?.toString() || '',
      category: item.category || '',
      notes: item.notes || ''
    })
    setShowItemForm(true)
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
          <button className="btn btn-primary" onClick={() => setShowListForm(true)}>
            <FiPlus /> {t('shoppingLists.newList')}
          </button>
        </div>
      </div>

      <div className="shopping-content">
        {/* Lists Sidebar */}
        <div className="lists-sidebar">
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
                    onClick={() => loadListDetails(list.id)}
                  >
                    <div className="list-card-header">
                      <h4>{list.name}</h4>
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
                            handleDeleteList(list.id)
                          }}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                    {list.estimatedTotal && (
                      <div className="list-estimate">
                        <FiDollarSign size={14} />
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
                    onClick={() => loadListDetails(list.id)}
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
        <div className="items-panel">
          {selectedList ? (
            <>
              <div className="items-header">
                <div>
                  <h2>{selectedList.list.name}</h2>
                  <div className="items-stats">
                    <span>
                      {selectedList.checkedCount} / {selectedList.itemCount} {t('shoppingLists.items')}
                    </span>
                    {selectedList.list.estimatedTotal && (
                      <span className="estimate">
                        {t('shoppingLists.estimated')}: {formatCurrency(selectedList.list.estimatedTotal)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="items-actions">
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
              </div>

              <div className="items-list">
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
                  selectedList.items.map(item => (
                    <div key={item.id} className={`item-card ${item.isChecked ? 'checked' : ''}`}>
                      <button
                        className="item-checkbox"
                        onClick={() => handleToggleItem(item.id)}
                      >
                        {item.isChecked ? <FiCheckSquare size={24} /> : <FiSquare size={24} />}
                      </button>
                      
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

                      <div className="item-actions">
                        <button
                          className="icon-btn"
                          onClick={() => handleEditItem(item)}
                        >
                          <FiEdit />
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="empty-selection">
              <FiShoppingCart size={64} />
              <h3>{t('shoppingLists.selectList')}</h3>
              <p>{t('shoppingLists.selectListDescription')}</p>
            </div>
          )}
        </div>
      </div>

      {/* List Form Modal */}
      {showListForm && (
        <div className="modal-overlay" onClick={resetListForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingList ? t('shoppingLists.editList') : t('shoppingLists.newList')}</h2>
              <button className="close-btn" onClick={resetListForm}>&times;</button>
            </div>

            <form onSubmit={handleListSubmit}>
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

              <div className="form-group">
                <label>{t('shoppingLists.category')}</label>
                <select name="category" value={listFormData.category} onChange={handleListChange}>
                  <option value="">{t('shoppingLists.selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

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

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetListForm}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingList ? t('common.update') : t('common.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      {showItemForm && (
        <div className="modal-overlay" onClick={resetItemForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? t('shoppingLists.editItem') : t('shoppingLists.addItem')}</h2>
              <button className="close-btn" onClick={resetItemForm}>&times;</button>
            </div>

            <form onSubmit={handleItemSubmit}>
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

              <div className="form-group">
                <label>{t('shoppingLists.estimatedPrice')}</label>
                <input
                  type="number"
                  name="estimatedPrice"
                  value={itemFormData.estimatedPrice}
                  onChange={handleItemChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
                <small>{t('shoppingLists.priceHint')}</small>
              </div>

              <div className="form-group">
                <label>{t('shoppingLists.category')}</label>
                <select name="category" value={itemFormData.category} onChange={handleItemChange}>
                  <option value="">{t('shoppingLists.selectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

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

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={resetItemForm}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItem ? t('common.update') : t('common.add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ShoppingLists
