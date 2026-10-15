import { useEffect, useMemo, useState } from 'react'
import { getUserName, getWebApp, initTelegram } from './telegram'

interface Client {
  id: string
  name: string
  location: string
  rent: number
}

type FilterType = 'all' | 'unpaid' | 'paid'

const STORAGE_KEY = 'ijara_clients_v1'
const PAYMENTS_KEY = 'ijara_payments_v1'

const defaultClients: Client[] = [
  { id: '1', name: 'Asosiy joy (150 kv)', location: 'Markaziy filial', rent: 1500000 },
  { id: '2', name: 'Anvar aka (Avtomoyka yonida)', location: "Sh. Rashidov ko'chasi", rent: 1200000 },
  { id: '3', name: "Sardor (Do'kon oldi)", location: 'Zargarlik mahallasi', rent: 800000 },
]

export default function App() {
  const [ready, setReady] = useState(false)
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : defaultClients
    } catch {
      return defaultClients
    }
  })

  const [payments, setPayments] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const saved = localStorage.getItem(PAYMENTS_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const [currentYM, setCurrentYM] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [locInput, setLocInput] = useState('')
  const [rentInput, setRentInput] = useState('')

  useEffect(() => {
    initTelegram()
    setReady(true)
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients))
  }, [clients])

  useEffect(() => {
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments))
  }, [payments])

  const tg = getWebApp()
  const userName = getUserName(tg)

  const formatSum = (num: number) => {
    return Number(num || 0).toLocaleString('uz-UZ') + " so'm"
  }

  const isPaid = (clientId: string) => {
    return !!(payments[currentYM] && payments[currentYM][clientId])
  }

  const togglePayment = (clientId: string) => {
    getWebApp()?.HapticFeedback?.impactOccurred('medium')
    setPayments((prev) => {
      const monthData = { ...(prev[currentYM] || {}) }
      if (monthData[clientId]) {
        delete monthData[clientId]
      } else {
        const d = new Date()
        monthData[clientId] = `${String(d.getDate()).padStart(2, '0')}.${String(
          d.getMonth() + 1,
        ).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(
          2,
          '0',
        )}:${String(d.getMinutes()).padStart(2, '0')}`
      }
      return { ...prev, [currentYM]: monthData }
    })
  }

  const stats = useMemo(() => {
    let total = 0
    let paidSum = 0
    let unpaidSum = 0
    let countPaid = 0
    let countUnpaid = 0

    clients.forEach((c) => {
      const r = Number(c.rent) || 0
      total += r
      if (payments[currentYM]?.[c.id]) {
        paidSum += r
        countPaid++
      } else {
        unpaidSum += r
        countUnpaid++
      }
    })

    return {
      total,
      paidSum,
      unpaidSum,
      countAll: clients.length,
      countPaid,
      countUnpaid,
    }
  }, [clients, payments, currentYM])

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim()
    return clients.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(q) || c.location.toLowerCase().includes(q)
      if (!matchSearch) return false
      const paid = !!(payments[currentYM] && payments[currentYM][c.id])
      if (filter === 'paid') return paid
      if (filter === 'unpaid') return !paid
      return true
    })
  }, [clients, search, filter, payments, currentYM])

  const openAddModal = () => {
    setEditId(null)
    setNameInput('')
    setLocInput('')
    setRentInput('')
    setModalOpen(true)
  }

  const openEditModal = (c: Client) => {
    setEditId(c.id)
    setNameInput(c.name)
    setLocInput(c.location)
    setRentInput(String(c.rent))
    setModalOpen(true)
  }

  const saveClient = () => {
    const trimmedName = nameInput.trim()
    const trimmedLoc = locInput.trim()
    const rentNum = Number(rentInput)

    if (!trimmedName || !trimmedLoc || !rentNum) {
      alert("Iltimos, barcha maydonlarni to'ldiring!")
      return
    }

    if (editId) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === editId
            ? { ...c, name: trimmedName, location: trimmedLoc, rent: rentNum }
            : c,
        ),
      )
    } else {
      setClients((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          name: trimmedName,
          location: trimmedLoc,
          rent: rentNum,
        },
      ])
    }
    setModalOpen(false)
  }

  const deleteClient = () => {
    if (!editId) return
    if (confirm("Haqiqatan ham bu klentni bazadan o'chirmoqchimisiz?")) {
      setClients((prev) => prev.filter((c) => c.id !== editId))
      setModalOpen(false)
    }
  }

  if (!ready) return null

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <p style={styles.brand}>IJARA NAZORATI · {userName}</p>
          <h1 style={styles.title}>📋 Oylik Ijaralar</h1>
        </div>
        <input
          type="month"
          value={currentYM}
          onChange={(e) => setCurrentYM(e.target.value)}
          style={styles.monthPicker}
        />
      </header>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Jami summa</div>
          <div style={styles.statVal}>{formatSum(stats.total)}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Berildi (+)</div>
          <div style={{ ...styles.statVal, color: '#10b981' }}>
            {formatSum(stats.paidSum)}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Qoldi</div>
          <div style={{ ...styles.statVal, color: '#f59e0b' }}>
            {formatSum(stats.unpaidSum)}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Klent ismi yoki manzili bo'yicha qidirish..."
          style={styles.searchInput}
        />
      </div>

      <div style={styles.tabsRow}>
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            ...styles.tabBtn,
            ...(filter === 'all' ? styles.tabBtnActive : {}),
          }}
        >
          Barchasi ({stats.countAll})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unpaid')}
          style={{
            ...styles.tabBtn,
            ...(filter === 'unpaid' ? styles.tabBtnActive : {}),
          }}
        >
          Berilmagan ({stats.countUnpaid})
        </button>
        <button
          type="button"
          onClick={() => setFilter('paid')}
          style={{
            ...styles.tabBtn,
            ...(filter === 'paid' ? styles.tabBtnActive : {}),
          }}
        >
          Berilgan + ({stats.countPaid})
        </button>
      </div>

      <div style={styles.clientList}>
        {filteredClients.length === 0 ? (
          <div style={styles.emptyState}>Klentlar topilmadi</div>
        ) : (
          filteredClients.map((c) => {
            const paid = isPaid(c.id)
            const paidTime = payments[currentYM]?.[c.id] || ''
            return (
              <div
                key={c.id}
                style={{
                  ...styles.clientCard,
                  ...(paid ? styles.clientCardPaid : {}),
                }}
              >
                <div
                  style={styles.clientInfo}
                  onClick={() => openEditModal(c)}
                >
                  <div style={styles.clientName}>{c.name}</div>
                  <div style={styles.clientLoc}>📍 {c.location}</div>
                  <div style={styles.clientPrice}>
                    💰 Oyiga: {formatSum(c.rent)}
                  </div>
                  {paid && (
                    <div style={styles.paidDate}>
                      ✅ Ijara berilgan: + ({paidTime})
                    </div>
                  )}
                </div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    onClick={() => openEditModal(c)}
                    style={styles.editBtn}
                    title="Tahrirlash"
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePayment(c.id)}
                    style={{
                      ...styles.plusBtn,
                      ...(paid ? styles.plusBtnPaid : {}),
                    }}
                    title="Ijara berilganini belgilash"
                  >
                    {paid ? '✓' : '+'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <button type="button" onClick={openAddModal} style={styles.fab}>
        ➕ Yangi klent qo'shish
      </button>

      {modalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>
              {editId ? "Klent ma'lumotlarini tahrirlash" : "Yangi klent qo'shish"}
            </h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Klent ismi (F.I.Sh yoki obyekt nomi)
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Masalan: Akmal aka"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Qayerdaligi (Manzil / Mo'ljal)</label>
              <input
                type="text"
                value={locInput}
                onChange={(e) => setLocInput(e.target.value)}
                placeholder="Masalan: Jizzax sh., Mustaqillik ko'chasi"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Oylik ijara to'lovi (so'mda)</label>
              <input
                type="number"
                value={rentInput}
                onChange={(e) => setRentInput(e.target.value)}
                placeholder="Masalan: 1500000"
                style={styles.input}
              />
            </div>

            <div style={styles.modalBtns}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={styles.cancelBtn}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={saveClient}
                style={styles.saveBtn}
              >
                Saqlash
              </button>
            </div>

            {editId && (
              <button
                type="button"
                onClick={deleteClient}
                style={styles.deleteBtn}
              >
                🗑 Klentni bazadan o'chirish
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#0f172a',
    color: '#f8fafc',
    minHeight: '100vh',
    padding: '16px',
    paddingBottom: '95px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  brand: {
    fontSize: '11px',
    color: '#94a3b8',
    letterSpacing: '0.6px',
    textTransform: 'uppercase',
    marginBottom: '2px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
  },
  monthPicker: {
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#f8fafc',
    padding: '8px 10px',
    borderRadius: '10px',
    fontSize: '13px',
    fontWeight: 600,
    outline: 'none',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  statCard: {
    background: '#1e293b',
    border: '1px solid #334155',
    padding: '12px 8px',
    borderRadius: '14px',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    marginBottom: '4px',
    textTransform: 'uppercase',
  },
  statVal: {
    fontSize: '13px',
    fontWeight: 700,
  },
  searchInput: {
    width: '100%',
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#f8fafc',
    padding: '11px 14px',
    borderRadius: '12px',
    fontSize: '14px',
    outline: 'none',
  },
  tabsRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '16px',
  },
  tabBtn: {
    flex: 1,
    padding: '9px 6px',
    borderRadius: '10px',
    background: '#1e293b',
    border: '1px solid #334155',
    color: '#94a3b8',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabBtnActive: {
    background: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
  },
  clientList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  clientCard: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '16px',
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  clientCardPaid: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    background: 'linear-gradient(145deg, #1e293b 0%, rgba(16, 185, 129, 0.1) 100%)',
  },
  clientInfo: {
    flex: 1,
    minWidth: 0,
    cursor: 'pointer',
  },
  clientName: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '4px',
  },
  clientLoc: {
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  clientPrice: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#60a5fa',
  },
  paidDate: {
    fontSize: '11px',
    color: '#10b981',
    marginTop: '4px',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '18px',
    padding: '6px',
    cursor: 'pointer',
  },
  plusBtn: {
    width: '46px',
    height: '46px',
    borderRadius: '14px',
    border: '2px solid #334155',
    background: '#0f172a',
    color: '#f8fafc',
    fontSize: '24px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  plusBtnPaid: {
    background: '#10b981',
    borderColor: '#10b981',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
  },
  fab: {
    position: 'fixed',
    bottom: '20px',
    left: '16px',
    right: '16px',
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    padding: '15px',
    borderRadius: '14px',
    fontSize: '16px',
    fontWeight: 700,
    boxSizing: 'border-box',
    cursor: 'pointer',
    zIndex: 10,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    zIndex: 50,
  },
  modal: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '400px',
    padding: '20px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '16px',
    marginTop: 0,
  },
  formGroup: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '6px',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    color: '#f8fafc',
    padding: '12px',
    borderRadius: '10px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  modalBtns: {
    display: 'flex',
    gap: '10px',
    marginTop: '18px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: '#334155',
    color: '#f8fafc',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  saveBtn: {
    flex: 1,
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: '#3b82f6',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  deleteBtn: {
    width: '100%',
    marginTop: '10px',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 16px',
    color: '#94a3b8',
    fontSize: '14px',
  },
}