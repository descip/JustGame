import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportService } from '../api/services'
import { useToastStore } from '../store/toastStore'
import { getErrorMessage } from '../utils/errorHandler'
import dayjs from 'dayjs'
import './Reports.css'

export default function Reports() {
  const [activeTab, setActiveTab] = useState<'power' | 'finance'>('power')
  
  // Power report
  const [powerDateFrom, setPowerDateFrom] = useState(
    dayjs().subtract(7, 'days').format('YYYY-MM-DDTHH:mm')
  )
  const [powerDateTo, setPowerDateTo] = useState(dayjs().format('YYYY-MM-DDTHH:mm'))
  const [pricePerKwh, setPricePerKwh] = useState(7.0)

  // Finance report
  const [financeDateFrom, setFinanceDateFrom] = useState(
    dayjs().subtract(30, 'days').format('YYYY-MM-DDTHH:mm')
  )
  const [financeDateTo, setFinanceDateTo] = useState(dayjs().format('YYYY-MM-DDTHH:mm'))

  const showToast = useToastStore((state) => state.showToast)

  // Конвертируем datetime-local в ISO формат для API
  const formatDateForAPI = (dateStr: string): string => {
    // Парсим дату через dayjs и конвертируем в ISO формат
    // dayjs автоматически обработает формат datetime-local
    return dayjs(dateStr).toISOString()
  }

  const { data: powerReport, isLoading: powerLoading, error: powerError } = useQuery({
    queryKey: ['power-report', powerDateFrom, powerDateTo, pricePerKwh],
    queryFn: () => {
      const from = formatDateForAPI(powerDateFrom)
      const to = formatDateForAPI(powerDateTo)
      return reportService.getPowerReport(from, to, pricePerKwh)
    },
    enabled: activeTab === 'power',
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  const { data: financeReport, isLoading: financeLoading, error: financeError } = useQuery({
    queryKey: ['finance-report', financeDateFrom, financeDateTo],
    queryFn: () => {
      const from = formatDateForAPI(financeDateFrom)
      const to = formatDateForAPI(financeDateTo)
      return reportService.getFinanceReport(from, to)
    },
    enabled: activeTab === 'finance',
    onError: (error) => {
      showToast(getErrorMessage(error), 'error')
    },
  })

  const handleExportPower = async () => {
    try {
      const from = formatDateForAPI(powerDateFrom)
      const to = formatDateForAPI(powerDateTo)
      const blob = await reportService.exportPowerReport(from, to, pricePerKwh)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `power_report_${dayjs(powerDateFrom).format('YYYY-MM-DD')}_${dayjs(powerDateTo).format('YYYY-MM-DD')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showToast('Отчет успешно экспортирован', 'success')
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    }
  }

  const handleExportFinance = async () => {
    try {
      const from = formatDateForAPI(financeDateFrom)
      const to = formatDateForAPI(financeDateTo)
      const blob = await reportService.exportFinanceReport(from, to)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finance_report_${dayjs(financeDateFrom).format('YYYY-MM-DD')}_${dayjs(financeDateTo).format('YYYY-MM-DD')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showToast('Отчет успешно экспортирован', 'success')
    } catch (error) {
      showToast(getErrorMessage(error), 'error')
    }
  }

  return (
    <div className="reports-page">
      <div className="page-section">
        <h2 className="page-title">Отчеты</h2>
        <p className="page-description">
          Генерация и экспорт отчетов по энергопотреблению и финансам. Доступно для ролей admin и operator.
        </p>

        <div className="reports-tabs">
          <button
            className={`tab-button ${activeTab === 'power' ? 'active' : ''}`}
            onClick={() => setActiveTab('power')}
          >
            Энергопотребление
          </button>
          <button
            className={`tab-button ${activeTab === 'finance' ? 'active' : ''}`}
            onClick={() => setActiveTab('finance')}
          >
            Финансы
          </button>
        </div>

        {/* Power Report */}
        {activeTab === 'power' && (
          <div className="report-content">
            <div className="report-filters">
              <div className="form-group">
                <label>Дата от</label>
                <input
                  type="datetime-local"
                  value={powerDateFrom}
                  onChange={(e) => setPowerDateFrom(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="form-group">
                <label>Дата до</label>
                <input
                  type="datetime-local"
                  value={powerDateTo}
                  onChange={(e) => setPowerDateTo(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="form-group">
                <label>Цена за кВт·ч</label>
                <input
                  type="number"
                  value={pricePerKwh}
                  onChange={(e) => setPricePerKwh(parseFloat(e.target.value) || 7.0)}
                  step="0.1"
                  min="0"
                  className="filter-input"
                />
              </div>
              <button onClick={handleExportPower} className="button-primary">
                Экспорт в Excel
              </button>
            </div>

            {powerLoading ? (
              <div className="loading">Загрузка отчета...</div>
            ) : powerError ? (
              <div className="error-message">
                {getErrorMessage(powerError)}
              </div>
            ) : powerReport ? (
              <div className="report-results">
                <div className="report-summary">
                  <div className="summary-item">
                    <span className="summary-label">Период:</span>
                    <span className="summary-value">
                      {dayjs(powerReport.date_from).format('DD.MM.YYYY')} -{' '}
                      {dayjs(powerReport.date_to).format('DD.MM.YYYY')}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Всего кВт·ч:</span>
                    <span className="summary-value">{powerReport.total_kwh}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Общая стоимость:</span>
                    <span className="summary-value">{powerReport.total_cost.toFixed(2)} ₽</span>
                  </div>
                </div>

                {powerReport.rows && powerReport.rows.length > 0 ? (
                  <div className="report-table">
                    <table>
                      <thead>
                        <tr>
                          <th>ID Машины</th>
                          <th>Название</th>
                          <th>Мощность (Вт)</th>
                          <th>Часов использовано</th>
                          <th>кВт·ч использовано</th>
                        </tr>
                      </thead>
                      <tbody>
                        {powerReport.rows.map((row) => (
                          <tr key={row.machine_id}>
                            <td>{row.machine_id}</td>
                            <td>{row.machine_name}</td>
                            <td>{row.watt}</td>
                            <td>{row.hours_used}</td>
                            <td>{row.kwh_used}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">Нет данных за выбранный период</div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Finance Report */}
        {activeTab === 'finance' && (
          <div className="report-content">
            <div className="report-filters">
              <div className="form-group">
                <label>Дата от</label>
                <input
                  type="datetime-local"
                  value={financeDateFrom}
                  onChange={(e) => setFinanceDateFrom(e.target.value)}
                  className="filter-input"
                />
              </div>
              <div className="form-group">
                <label>Дата до</label>
                <input
                  type="datetime-local"
                  value={financeDateTo}
                  onChange={(e) => setFinanceDateTo(e.target.value)}
                  className="filter-input"
                />
              </div>
              <button onClick={handleExportFinance} className="button-primary">
                Экспорт в Excel
              </button>
            </div>

            {financeLoading ? (
              <div className="loading">Загрузка отчета...</div>
            ) : financeError ? (
              <div className="error-message">
                {getErrorMessage(financeError)}
              </div>
            ) : financeReport ? (
              <div className="report-results">
                <div className="finance-summary">
                  <div className="finance-section">
                    <h3 className="finance-section-title">Доходы</h3>
                    <div className="finance-item income">
                      <span className="finance-label">Доходы:</span>
                      <span className="finance-value">{financeReport.income.toFixed(2)} ₽</span>
                    </div>
                  </div>

                  <div className="finance-section">
                    <h3 className="finance-section-title">Расходы</h3>
                    <div className="finance-item">
                      <span className="finance-label">Аренда:</span>
                      <span className="finance-value">{financeReport.expense_rent.toFixed(2)} ₽</span>
                    </div>
                    <div className="finance-item">
                      <span className="finance-label">Зарплаты:</span>
                      <span className="finance-value">{financeReport.expense_salaries.toFixed(2)} ₽</span>
                    </div>
                    <div className="finance-item">
                      <span className="finance-label">Налоги:</span>
                      <span className="finance-value">{financeReport.expense_taxes.toFixed(2)} ₽</span>
                    </div>
                    <div className="finance-item">
                      <span className="finance-label">Электричество:</span>
                      <span className="finance-value">{financeReport.expense_electricity.toFixed(2)} ₽</span>
                    </div>
                    <div className="finance-item total">
                      <span className="finance-label">Всего расходов:</span>
                      <span className="finance-value">{financeReport.total_expenses.toFixed(2)} ₽</span>
                    </div>
                  </div>

                  <div className="finance-section">
                    <h3 className="finance-section-title">Прибыль</h3>
                    <div className={`finance-item profit ${financeReport.profit >= 0 ? 'positive' : 'negative'}`}>
                      <span className="finance-label">Прибыль:</span>
                      <span className="finance-value">{financeReport.profit.toFixed(2)} ₽</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
