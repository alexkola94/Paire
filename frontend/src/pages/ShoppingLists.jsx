import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  FiShoppingCart, FiPlus, FiEdit, FiTrash2, FiCheck, 
  FiSquare, FiCheckSquare, FiPackage, FiList
} from 'react-icons/fi'
import { formatCurrency } from '../utils/formatCurrency'
import { shoppingListService } from '../services/api'
import ConfirmationModal from '../components/ConfirmationModal'
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
  const [deleteListModal, setDeleteListModal] = useState({ isOpen: false, listId: null })
  const [deleteItemModal, setDeleteItemModal] = useState({ isOpen: false, itemId: null })
  
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
      setLoading(false)
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
      await loadLists()
      resetListForm()
    } catch (error) {
      console.error('Error saving list:', error)
      alert(t('shoppingLists.errorSaving'))
    }
  }

  const handleItemSubmit = async (e) => {
    e.preventDefault()
    if (!selectedList) return
    
    try {
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
      await loadListDetails(selectedList.list.id)
      resetItemForm()
    } catch (error) {
      console.error('Error saving item:', error)
      alert(t('shoppingLists.errorSavingItem'))
    }
  }

  const handleToggleItem = async (itemId) => {
    if (!selectedList) return
    
    try {
      await shoppingListService.toggleItem(selectedList.list.id, itemId)
      await loadListDetails(selectedList.list.id)
    } catch (error) {
      console.error('Error toggling item:', error)
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
                      <div className="list-title-section">
                        <h4>{list.name}</h4>
                        {list.userProfiles && (
                          <div className="list-added-by">
                            {t('shoppingLists.addedBy')} {list.userProfiles.display_name || list.userProfiles.displayName}
                            {list.userProfiles.email && (
                              <span className="added-by-email"> ({list.userProfiles.email})</span>
                            )}
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
                          onClick={() => openDeleteItemModal(item.id)}
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
                  max="1000000"
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
    </div>
  )
}

export default ShoppingLists
