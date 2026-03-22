import { useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import './App.css'

const pageFormats = [
  { key: 'a4', label: 'A4', width: 210, height: 297 },
  { key: 'b5', label: 'B5', width: 176, height: 250 },
] as const

const guideOptions = [
  { key: 'cross', label: '十字线' },
  { key: 'diagonal', label: '对角线' },
  { key: 'inner-square', label: '回宫框' },
  { key: 'nine-square', label: '九宫格' },
  { key: 'well-circle', label: '井圆格' },
] as const

type PageFormatKey = (typeof pageFormats)[number]['key']
type GuideKey = (typeof guideOptions)[number]['key']
type GridColorKey = 'red' | 'black'

function PreviewCell({
  guides,
  gridColor,
}: {
  guides: GuideKey[]
  gridColor: GridColorKey
}) {
  return (
    <div className={`preview-cell preview-cell--${gridColor}`}>
      {guides.includes('cross') && <span className="guide-layer guide-layer--cross" />}
      {guides.includes('diagonal') && (
        <span className="guide-layer guide-layer--diagonal" />
      )}
      {guides.includes('inner-square') && (
        <span className="guide-layer guide-layer--inner-square" />
      )}
      {guides.includes('nine-square') && (
        <span className="guide-layer guide-layer--nine-square" />
      )}
      {guides.includes('well-circle') && (
        <span className="guide-layer guide-layer--well-circle" />
      )}
      <span className="preview-cell__label">永</span>
    </div>
  )
}

function drawCell(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  guides: GuideKey[],
  gridColor: GridColorKey,
) {
  doc.setLineWidth(0.2)
  const strokeColor = gridColor === 'red' ? [167, 86, 52] : [38, 38, 38]
  doc.setDrawColor(strokeColor[0], strokeColor[1], strokeColor[2])
  doc.rect(x, y, size, size)

  if (guides.includes('cross')) {
    doc.setLineDashPattern([1, 0.8], 0)
    doc.line(x + size / 2, y, x + size / 2, y + size)
    doc.line(x, y + size / 2, x + size, y + size / 2)
  }

  if (guides.includes('diagonal')) {
    doc.setLineDashPattern([1, 0.8], 0)
    doc.line(x, y, x + size, y + size)
    doc.line(x + size, y, x, y + size)
  }

  if (guides.includes('inner-square')) {
    const inset = size * 0.22
    doc.setLineDashPattern([], 0)
    doc.rect(x + inset, y + inset, size - inset * 2, size - inset * 2)
    doc.setLineDashPattern([1, 0.8], 0)
    doc.line(x + size / 2, y, x + size / 2, y + size)
    doc.line(x, y + size / 2, x + size, y + size / 2)
  }

  if (guides.includes('nine-square')) {
    doc.setLineDashPattern([1, 0.8], 0)
    doc.line(x + size / 3, y, x + size / 3, y + size)
    doc.line(x + (size * 2) / 3, y, x + (size * 2) / 3, y + size)
    doc.line(x, y + size / 3, x + size, y + size / 3)
    doc.line(x, y + (size * 2) / 3, x + size, y + (size * 2) / 3)
  }

  if (guides.includes('well-circle')) {
    const radius = size * 0.44
    const inset = size * 0.2
    doc.setLineDashPattern([], 0)
    doc.circle(x + size / 2, y + size / 2, radius)
    doc.setLineDashPattern([1, 0.8], 0)
    doc.line(x + inset, y + size / 3, x + size - inset, y + size / 3)
    doc.line(x + inset, y + (size * 2) / 3, x + size - inset, y + (size * 2) / 3)
    doc.line(x + size / 3, y + inset, x + size / 3, y + size - inset)
    doc.line(x + (size * 2) / 3, y + inset, x + (size * 2) / 3, y + size - inset)
  }

  doc.setLineDashPattern([], 0)
}

function App() {
  const [formatKey, setFormatKey] = useState<PageFormatKey>('a4')
  const [cellSize, setCellSize] = useState(18)
  const [columns, setColumns] = useState(9)
  const [rows, setRows] = useState(13)
  const [gridColor, setGridColor] = useState<GridColorKey>('red')
  const [selectedGuides, setSelectedGuides] = useState<GuideKey[]>([
    'cross',
    'diagonal',
  ])

  const selectedFormat = pageFormats.find((item) => item.key === formatKey) ?? pageFormats[0]
  const pageWidth = selectedFormat.width
  const pageHeight = selectedFormat.height
  const layoutWidthMm = cellSize * columns
  const layoutHeightMm = cellSize * rows
  const remainWidthMm = pageWidth - layoutWidthMm
  const remainHeightMm = pageHeight - layoutHeightMm
  const layoutFitsPage = remainWidthMm >= 0 && remainHeightMm >= 0
  const spacingX = layoutFitsPage ? remainWidthMm / (columns + 1) : 0
  const spacingY = layoutFitsPage ? remainHeightMm / (rows + 1) : 0
  const cellWidthPercent = (cellSize / pageWidth) * 100
  const cellHeightPercent = (cellSize / pageHeight) * 100
  const spacingXPercent = (spacingX / pageWidth) * 100
  const spacingYPercent = (spacingY / pageHeight) * 100
  const layoutWidthPercent = (layoutWidthMm / pageWidth) * 100
  const layoutHeightPercent = (layoutHeightMm / pageHeight) * 100
  const totalCells = rows * columns

  const guideLabel = useMemo(() => {
    if (selectedGuides.length === 0) {
      return '仅外框'
    }

    return guideOptions
      .filter((option) => selectedGuides.includes(option.key))
      .map((option) => option.label)
      .join(' + ')
  }, [selectedGuides])

  const toggleGuide = (guide: GuideKey) => {
    setSelectedGuides((current) =>
      current.includes(guide)
        ? current.filter((item) => item !== guide)
        : [...current, guide],
    )
  }

  const exportPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pageWidth, pageHeight],
    })

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = spacingX + column * (cellSize + spacingX)
        const y = spacingY + row * (cellSize + spacingY)
        drawCell(doc, x, y, cellSize, selectedGuides, gridColor)
      }
    }

    doc.save(`calligrid-${selectedFormat.key}-portrait.pdf`)
  }

  return (
    <div className="app-shell">
      <nav className="topbar">
        <div>
          <p className="eyebrow">Calligrid</p>
          <h1>书法格子生成工具</h1>
        </div>
        <div className="topbar__actions">
          <a
            className="ghost-link"
            href="https://github.com/Minsecrus/Calligrid"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub 仓库链接"
          >
            GitHub
          </a>
          <button className="primary-button" type="button" onClick={exportPdf}>
            导出 PDF
          </button>
        </div>
      </nav>

      <main className="workspace">
        <aside className="control-panel">
          <section className="panel-card">
            <div className="section-heading">
              <p className="section-heading__eyebrow">页面规格</p>
              <h2>选项区</h2>
            </div>

            <div className="field-grid">
              <div className="field">
                <span>纸张尺寸</span>
                <div className="chip-row">
                  {pageFormats.map((format) => (
                    <button
                      key={format.key}
                      type="button"
                      className={`chip ${format.key === formatKey ? 'chip--active' : ''}`}
                      onClick={() => setFormatKey(format.key)}
                    >
                      {format.label}
                    </button>
                  ))}
                </div>
              </div>
              <fieldset className="field fieldset">
                <legend>格子类型</legend>
                <div className="checkbox-list">
                  {guideOptions.map((option) => (
                    <label key={option.key} className="checkbox-card">
                      <input
                        checked={selectedGuides.includes(option.key)}
                        type="checkbox"
                        onChange={() => toggleGuide(option.key)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="field">
                <span>格线颜色</span>
                <div className="chip-row">
                  <button
                    type="button"
                    className={`chip ${gridColor === 'red' ? 'chip--active' : ''}`}
                    onClick={() => setGridColor('red')}
                  >
                    红色
                  </button>
                  <button
                    type="button"
                    className={`chip ${gridColor === 'black' ? 'chip--active' : ''}`}
                    onClick={() => setGridColor('black')}
                  >
                    黑色
                  </button>
                </div>
              </div>

              <label className="field">
                <span>单格边长</span>
                <div className="field-inline">
                  <input
                    min="8"
                    max="60"
                    value={cellSize}
                    type="number"
                    onChange={(event) => setCellSize(Math.max(Number(event.target.value) || 8, 1))}
                  />
                  <em>mm</em>
                </div>
              </label>

              <label className="field">
                <span>每列格子数量</span>
                <input
                  min="1"
                  max="40"
                  value={columns}
                  type="number"
                  onChange={(event) => setColumns(Math.max(Number(event.target.value) || 1, 1))}
                />
              </label>

              <label className="field">
                <span>每行格子数量</span>
                <input
                  min="1"
                  max="60"
                  value={rows}
                  type="number"
                  onChange={(event) => setRows(Math.max(Number(event.target.value) || 1, 1))}
                />
              </label>
            </div>
          </section>

          <section className="panel-card panel-card--muted">
            <div className="stats">
              <div>
                <span>纸张</span>
                <strong>
                  {selectedFormat.label} 竖版 / {pageWidth} × {pageHeight} mm
                </strong>
              </div>
              <div>
                <span>格线组合</span>
                <strong>{guideLabel}</strong>
              </div>
              <div>
                <span>格线颜色</span>
                <strong>{gridColor === 'red' ? '红色' : '黑色'}</strong>
              </div>
              <div>
                <span>当前排版</span>
                <strong>
                  {columns} 列 × {rows} 行 / 共 {totalCells} 格
                </strong>
              </div>
              <div>
                <span>自动铺排间距</span>
                <strong className={layoutFitsPage ? 'status-ok' : 'status-warning'}>
                  左右与列间 {spacingX.toFixed(1)} mm / 上下与行间 {spacingY.toFixed(1)} mm
                </strong>
              </div>
              <div>
                <span>页面占用</span>
                <strong className={layoutFitsPage ? 'status-ok' : 'status-warning'}>
                  {layoutWidthPercent.toFixed(1)}% × {layoutHeightPercent.toFixed(1)}%
                </strong>
              </div>
              {!layoutFitsPage && (
                <div className="warning-note">
                  当前设置已超出纸张范围，预览和导出会标记越界区域。
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="preview-column">
          <article className="panel-card">
            <div className="section-heading section-heading--row">
              <div>
                <p className="section-heading__eyebrow">细节检查</p>
                <h2>单个格子预览区</h2>
              </div>
              <span className="badge">{guideLabel}</span>
            </div>

            <div className="single-preview">
              <PreviewCell guides={selectedGuides} gridColor={gridColor} />
            </div>
          </article>

          <article className="panel-card page-preview-card">
            <div className="section-heading section-heading--row">
              <div>
                <p className="section-heading__eyebrow">排版结果</p>
                <h2>整页预览区</h2>
              </div>
              <span className="page-meta">
                {selectedFormat.label} 竖版
              </span>
            </div>

            <div className="page-preview">
              <div className="sheet">
                <div
                  className={`sheet-grid ${!layoutFitsPage ? 'sheet-grid--overflow' : ''}`}
                  style={{
                    gridTemplateColumns: `repeat(${columns}, ${cellWidthPercent}%)`,
                    gridAutoRows: `${cellHeightPercent}%`,
                    columnGap: `${spacingXPercent}%`,
                    rowGap: `${spacingYPercent}%`,
                    padding: `${spacingYPercent}% ${spacingXPercent}%`,
                  }}
                  aria-hidden="true"
                >
                  {Array.from({ length: totalCells }).map((_, index) => (
                    <div key={index} className={`sheet-cell sheet-cell--${gridColor}`}>
                      {selectedGuides.includes('cross') && (
                        <span className="guide-layer guide-layer--cross" />
                      )}
                      {selectedGuides.includes('diagonal') && (
                        <span className="guide-layer guide-layer--diagonal" />
                      )}
                      {selectedGuides.includes('inner-square') && (
                        <span className="guide-layer guide-layer--inner-square" />
                      )}
                      {selectedGuides.includes('nine-square') && (
                        <span className="guide-layer guide-layer--nine-square" />
                      )}
                      {selectedGuides.includes('well-circle') && (
                        <span className="guide-layer guide-layer--well-circle" />
                      )}
                    </div>
                  ))}
                </div>
                {!layoutFitsPage && <div className="overflow-mask">超出纸张范围</div>}
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}

export default App
