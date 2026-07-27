import { useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react'
import { Controller, useFormContext } from 'react-hook-form'
import { Button, ButtonToggle, ComboBox } from '@odyssey/ui'
import ProductGrid from '../ProductGrid.jsx'

/**
 * Product Information (spec §3.3, screens 4). Toolbar: search · US|Metric
 * ButtonToggle (text mode — display conversion only) · sort direction.
 * Column-manage icon moved to the table header's last column (inert, per
 * Efrain screenshots — 2026-06-12 design conformance). The RHF `products`
 * array holds saved rows; ProductGrid owns the in-flight editor row.
 */
export default function ProductInformationSection() {
  const { control } = useFormContext()
  const [search, setSearch] = useState('')
  const [system, setSystem] = useState('us') // US default (screens 4)
  const [sortDir, setSortDir] = useState(null) // null = insertion order until first toggle

  const SortIcon = sortDir === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow

  return (
    <Controller
      name="products"
      control={control}
      render={({ field }) => (
        <div className="co-section-body">
          <div className="co-product-toolbar">
            <ComboBox
              className="co-product-search"
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search"
            />
            <div className="co-product-toolbar__right">
              <ButtonToggle
                firstLabel="US"
                secondLabel="Metric"
                selected={system === 'us' ? 'first' : 'second'}
                onChange={(next) => setSystem(next === 'first' ? 'us' : 'metric')}
              />
              <Button
                variant="icon"
                size="sm"
                icon={<SortIcon size={20} />}
                aria-label="Toggle sort by Product ID"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              />
            </div>
          </div>

          <hr className="co-product-divider" />

          <p className="co-product-count text-label-sm-regular">
            {field.value.length} products added
          </p>

          <ProductGrid
            products={field.value}
            system={system}
            search={search}
            sortDir={sortDir}
            onChange={field.onChange}
          />
        </div>
      )}
    />
  )
}
