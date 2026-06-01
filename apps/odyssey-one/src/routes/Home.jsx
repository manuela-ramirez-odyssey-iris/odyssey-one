import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  ClipboardList,
  Container,
  Download,
  Plus,
  Route,
  TriangleAlert,
  Truck,
  UserCog,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ICON_LG } from '@odyssey/tokens'
import {
  AddSectionButton,
  AddSectionDivider,
  Button,
  EmptyState,
  ModalLarge,
  ModalMedium,
  PageHeader,
  SectionHeader,
  SectionLabel,
  Widget,
  WidgetVariantPicker,
  WidgetsLeftMenu,
} from '@odyssey/ui'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import AppShell from '../components/layout/AppShell'
import { useEditMode } from '../contexts/EditModeContext.jsx'
import { useCustomers } from '../contexts/CustomersContext.jsx'
import { useTrackingLoadStatistics } from '../hooks/useTrackingLoadStatistics'
import { HERO_IMAGES, HERO_ROTATE_MS, HERO_INITIAL_INDEX, heroPosition } from '../heroImages'
import './Home.css'

const domainIcon = <TriangleAlert {...ICON_LG} />

const handleRow = (label) => () => console.log('drill into', label)

const exceptionRows = [
  { label: 'Date issues', value: '23', onClick: handleRow('date-issues') },
  { label: 'Missing documents', value: '17', onClick: handleRow('missing-docs') },
  { label: 'Stops at risk', value: '12', onClick: handleRow('stops-at-risk') },
  { label: 'Tender rejections', value: '8', onClick: handleRow('tender-rej') },
]

const chartRows = [
  { label: 'Carrier delay', value: '42%', indicatorColor: 'var(--chart-1)', onClick: handleRow('carrier-delay') },
  { label: 'Customer hold', value: '28%', indicatorColor: 'var(--chart-2)', onClick: handleRow('customer-hold') },
  { label: 'Document missing', value: '18%', indicatorColor: 'var(--chart-3)', onClick: handleRow('doc-missing') },
  { label: 'Other', value: '12%', indicatorColor: 'var(--chart-4)', onClick: handleRow('other') },
]

const chartSegments = [
  { value: 42, color: 'var(--chart-1)' },
  { value: 28, color: 'var(--chart-2)' },
  { value: 18, color: 'var(--chart-3)' },
  { value: 12, color: 'var(--chart-4)' },
]

const singleChartSegment = [{ value: 42, color: 'var(--chart-1)' }]

function previewWidgetProps(variant, itemLabel) {
  const base = {
    title: itemLabel,
    domainIcon,
    goToLabel: `Go to ${itemLabel}`,
    onGoToClick: () => {},
  }
  if (variant === '1x') {
    return { ...base, value: '12', label: 'Across all customers' }
  }
  if (variant === '2x') {
    return {
      ...base,
      value: '12',
      label: 'Need action today',
      percentage: '42%',
      chartSegments: singleChartSegment,
      chartTotal: 100,
    }
  }
  if (variant === '3x') {
    return { ...base, rows: exceptionRows }
  }
  if (variant === '3xChart') {
    return {
      ...base,
      value: '156',
      label: 'Total this week',
      chartSegments,
      rows: chartRows,
    }
  }
  return base
}

const widgetGoToPaths = {
  'order-exceptions': '/orders',
  'carriers-active': '/tracking',
  'um-locked': '/users',
  'um-pending': '/users',
  'um-account-reviews': '/users',
  'um-rejected': '/users',
  'tracking-load-status': '/tracking',
  'shipments-monitoring': '/shipments',
  'shipments-po-ipgr': '/shipments',
  'tracking-total': '/tracking',
  'orders-exceptions-detail': '/orders',
  'orders-fulfillment': '/orders',
  'tracking-at-risk': '/tracking',
  'tracking-on-time': '/tracking',
  'carriers-performance': '/carriers',
  'carriers-capacity': '/carriers',
  'shipments-exceptions': '/shipments',
  'users-activity': '/users',
  'users-reviews': '/users',
}

const ctaRowsStub = [
  { icon: <Plus size={20} />, label: 'Go to Create a New Order', onClick: () => {} },
  { icon: <Route size={20} />, label: 'Track a Shipment', onClick: () => {} },
  { icon: <UserCog size={20} />, label: 'Management Users', onClick: () => {} },
  { icon: <Download size={20} />, label: 'Invoices', onClick: () => {} },
]

const orderIcon = <ClipboardList {...ICON_LG} />
const carriersIcon = <Truck {...ICON_LG} />
const userMgmtIcon = <UserCog {...ICON_LG} />
const shipmentsIcon = <Container {...ICON_LG} />
const trackingIcon = <Route {...ICON_LG} />

const shipmentsMonitoringRows = [
  { label: 'Hold', value: '533 (64.93%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('hold') },
  { label: 'Consolidation', value: '128 (15.53%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('consolidation') },
  { label: 'Sent', value: '99 (12.05%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('sent') },
  { label: 'Spotted', value: '64 (7.49%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('spotted') },
]

const shipmentsMonitoringSegments = [
  { value: 533, color: 'var(--chart-1)' },
  { value: 128, color: 'var(--chart-2)' },
  { value: 99, color: 'var(--chart-3)' },
  { value: 64, color: 'var(--chart-4)' },
]

const shipmentsPoIpgrRows = [
  { label: 'PO Errors', value: '56 (48.43%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('po-errors') },
  { label: 'IPGR Errors', value: '32 (27.65%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('ipgr-errors') },
  { label: 'Routing Failures', value: '17 (14.55%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('routing-failures') },
  { label: 'Manual PO/IPGR', value: '10 (9.37%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('manual-po-ipgr') },
]

const shipmentsPoIpgrSegments = [
  { value: 56, color: 'var(--chart-1)' },
  { value: 32, color: 'var(--chart-2)' },
  { value: 17, color: 'var(--chart-3)' },
  { value: 10, color: 'var(--chart-4)' },
]

const trackingRows = [
  { label: 'At Risk Pickup', value: '0 (0%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('at-risk-pickup') },
  { label: 'At Risk Delivery', value: '34 (0.05%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('at-risk-delivery') },
  { label: 'Picked Up - On Time', value: '32 (0.05%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('picked-on-time') },
  { label: 'Picked Up - Late', value: '15 (0.02%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('picked-late') },
]

const trackingSegments = [
  { value: 1, color: 'var(--chart-1)' },
  { value: 34, color: 'var(--chart-2)' },
  { value: 32, color: 'var(--chart-3)' },
  { value: 15, color: 'var(--chart-4)' },
]

// Order matters: auto-pack places widgets in this order on first render, so
// the resulting layout matches the "Overview" + "Shipments" reference
// (see shipments-documentation/Documentation/screenshots reference/Home_with_background.png).
const initialWidgets = [
  // --- Overview row 1 ---
  {
    id: 'order-exceptions',
    variant: '2x',
    props: {
      title: 'Order',
      domainIcon: orderIcon,
      value: '99',
      label: 'Order Exceptions',
      percentage: '25%',
      chartSegments: [{ value: 25, color: 'var(--chart-1)' }],
      chartTotal: 100,
      goToLabel: 'Go to Order',
      onGoToClick: handleRow('order-exceptions'),
    },
  },
  {
    id: 'um-locked',
    variant: '1x',
    props: {
      title: 'User Management',
      domainIcon: userMgmtIcon,
      value: '8',
      label: 'Locked',
      onGoToClick: handleRow('um-locked'),
    },
  },
  {
    id: 'um-pending',
    variant: '1x',
    props: {
      title: 'User Management',
      domainIcon: userMgmtIcon,
      value: '10',
      label: 'Pending',
      onGoToClick: handleRow('um-pending'),
    },
  },
  {
    id: 'home-quick-actions',
    variant: '3xCta',
    props: {
      title: 'What would you like to do?',
      ctaRows: ctaRowsStub,
    },
  },
  // --- Overview row 2 ---
  {
    id: 'carriers-active',
    variant: '2x',
    props: {
      title: 'Carriers',
      domainIcon: carriersIcon,
      value: '5269',
      label: 'Active',
      percentage: '89%',
      chartSegments: [{ value: 89, color: 'var(--chart-1)' }],
      chartTotal: 100,
      goToLabel: 'Go to Tracking',
      onGoToClick: handleRow('carriers-active'),
    },
  },
  {
    id: 'um-account-reviews',
    variant: '1x',
    props: {
      title: 'User Management',
      domainIcon: userMgmtIcon,
      value: '12',
      label: 'New Account Reviews',
      onGoToClick: handleRow('um-account-reviews'),
    },
  },
  {
    id: 'um-rejected',
    variant: '1x',
    props: {
      title: 'User Management',
      domainIcon: userMgmtIcon,
      value: '4',
      label: 'Rejected Request',
      onGoToClick: handleRow('um-rejected'),
    },
  },
  // --- Shipments row ---
  {
    id: 'tracking-load-status',
    variant: '3xChart',
    props: {
      title: 'Tracking — Load Status',
      domainIcon: trackingIcon,
      // Zero/empty state shown until live load-statistics resolve (see the
      // useTrackingLoadStatistics effect). Empty gray ring + 0 rows so nothing
      // stale/confusing flashes before the real numbers arrive.
      value: '0',
      label: 'Total Loads (Last 30 Days)',
      chartSegments: [{ value: 1, color: 'var(--chart-rest)' }],
      chartTotal: 1,
      rows: [
        { label: 'Scheduled P/U Today', value: '0', indicatorColor: 'var(--chart-1)', onClick: handleRow('scheduled-pu') },
        { label: 'EnRoute', value: '0', indicatorColor: 'var(--chart-2)', onClick: handleRow('enroute') },
        { label: 'Delivered', value: '0', indicatorColor: 'var(--chart-3)', onClick: handleRow('delivered') },
        { label: 'At Risk', value: '0', indicatorColor: 'var(--chart-4)', onClick: handleRow('at-risk') },
      ],
      goToLabel: 'Go to Tracking',
      onGoToClick: handleRow('tracking-load-status'),
    },
  },
  {
    id: 'shipments-monitoring',
    variant: '3xChart',
    props: {
      title: 'Shipments - Monitoring',
      domainIcon: shipmentsIcon,
      value: '824',
      label: 'Total Shipments in Monitoring',
      chartSegments: shipmentsMonitoringSegments,
      rows: shipmentsMonitoringRows,
      goToLabel: 'Go to Shipments Monitoring',
      onGoToClick: handleRow('shipments-monitoring'),
    },
  },
  {
    id: 'shipments-po-ipgr',
    variant: '3xChart',
    props: {
      title: 'Shipments - PO/IPGR',
      domainIcon: shipmentsIcon,
      value: '115',
      label: 'Total PO/IPGR',
      chartSegments: shipmentsPoIpgrSegments,
      rows: shipmentsPoIpgrRows,
      goToLabel: 'Go to Shipments PO/IPGR',
      onGoToClick: handleRow('shipments-po-ipgr'),
    },
  },
  // --- Dummy data, ready (NOT placed in the default layout) ----------------
  // These mirror the live tracking-load-status shape (value, chartSegments,
  // chartTotal, rows) so the count-up + pie-chart parsers already handle them.
  // To surface one: add its id to a section's widgetIds (initialSections) — or,
  // when its API lands, swap the static numbers for a live fetch the way the
  // tracking-load-status useEffect does. NOTE: only tracking-load-status is
  // wired to a real data source today; everything below is placeholder data.
  {
    id: 'orders-exceptions-detail',
    variant: '3xChart',
    props: {
      title: 'Orders — Exceptions',
      domainIcon: orderIcon,
      value: '312',
      label: 'Total Order Exceptions',
      chartSegments: [
        { value: 134, color: 'var(--chart-1)' },
        { value: 88, color: 'var(--chart-2)' },
        { value: 56, color: 'var(--chart-3)' },
        { value: 34, color: 'var(--chart-4)' },
      ],
      chartTotal: 312,
      rows: [
        { label: 'Data Validation', value: '134 (42.95%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('data-validation') },
        { label: 'Interface Failures', value: '88 (28.21%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('interface-failures') },
        { label: 'Canceled', value: '56 (17.95%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('canceled') },
        { label: 'Duplicates', value: '34 (10.90%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('duplicates') },
      ],
      goToLabel: 'Go to Orders',
      onGoToClick: handleRow('orders-exceptions-detail'),
    },
  },
  {
    id: 'orders-fulfillment',
    variant: '3xChart',
    props: {
      title: 'Orders — Fulfillment',
      domainIcon: orderIcon,
      value: '1,240',
      label: 'Total Orders in Fulfillment',
      chartSegments: [
        { value: 418, color: 'var(--chart-1)' },
        { value: 366, color: 'var(--chart-2)' },
        { value: 281, color: 'var(--chart-3)' },
        { value: 175, color: 'var(--chart-4)' },
      ],
      chartTotal: 1240,
      rows: [
        { label: 'Open', value: '418 (33.71%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('open') },
        { label: 'Picking', value: '366 (29.52%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('picking') },
        { label: 'Packed', value: '281 (22.66%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('packed') },
        { label: 'Shipped', value: '175 (14.11%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('shipped') },
      ],
      goToLabel: 'Go to Orders',
      onGoToClick: handleRow('orders-fulfillment'),
    },
  },
  // --- Tracking section ---
  {
    id: 'tracking-at-risk',
    variant: '3xChart',
    props: {
      title: 'Tracking — At Risk',
      domainIcon: trackingIcon,
      value: '287',
      label: 'Total At Risk Loads',
      chartSegments: [
        { value: 96, color: 'var(--chart-1)' },
        { value: 82, color: 'var(--chart-2)' },
        { value: 71, color: 'var(--chart-3)' },
        { value: 38, color: 'var(--chart-4)' },
      ],
      chartTotal: 287,
      rows: [
        { label: 'At Risk Pickup', value: '96 (33.45%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('at-risk-pickup') },
        { label: 'At Risk Delivery', value: '82 (28.57%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('at-risk-delivery') },
        { label: 'Delayed', value: '71 (24.74%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('delayed') },
        { label: 'Exception', value: '38 (13.24%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('exception') },
      ],
      goToLabel: 'Go to Tracking',
      onGoToClick: handleRow('tracking-at-risk'),
    },
  },
  {
    id: 'tracking-on-time',
    variant: '3xChart',
    props: {
      title: 'Tracking — On Time',
      domainIcon: trackingIcon,
      value: '1,684',
      label: 'Total On Time Loads',
      chartSegments: [
        { value: 612, color: 'var(--chart-1)' },
        { value: 548, color: 'var(--chart-2)' },
        { value: 327, color: 'var(--chart-3)' },
        { value: 197, color: 'var(--chart-4)' },
      ],
      chartTotal: 1684,
      rows: [
        { label: 'On Time Pickup', value: '612 (36.34%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('on-time-pickup') },
        { label: 'On Time Delivery', value: '548 (32.54%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('on-time-delivery') },
        { label: 'Early', value: '327 (19.42%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('early') },
        { label: 'Late', value: '197 (11.70%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('late') },
      ],
      goToLabel: 'Go to Tracking',
      onGoToClick: handleRow('tracking-on-time'),
    },
  },
  // --- Carriers section ---
  {
    id: 'carriers-performance',
    variant: '3xChart',
    props: {
      title: 'Carriers — Performance',
      domainIcon: carriersIcon,
      value: '946',
      label: 'Total Carrier Performance',
      chartSegments: [
        { value: 612, color: 'var(--chart-1)' },
        { value: 188, color: 'var(--chart-2)' },
        { value: 92, color: 'var(--chart-3)' },
        { value: 54, color: 'var(--chart-4)' },
      ],
      chartTotal: 946,
      rows: [
        { label: 'On Time', value: '612 (64.69%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('on-time') },
        { label: 'Late', value: '188 (19.87%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('late') },
        { label: 'Rejected', value: '92 (9.73%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('rejected') },
        { label: 'No Response', value: '54 (5.71%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('no-response') },
      ],
      goToLabel: 'Go to Carriers',
      onGoToClick: handleRow('carriers-performance'),
    },
  },
  {
    id: 'carriers-capacity',
    variant: '3xChart',
    props: {
      title: 'Carriers — Capacity',
      domainIcon: carriersIcon,
      value: '1,432',
      label: 'Total Carrier Capacity',
      chartSegments: [
        { value: 724, color: 'var(--chart-1)' },
        { value: 486, color: 'var(--chart-2)' },
        { value: 142, color: 'var(--chart-3)' },
        { value: 80, color: 'var(--chart-4)' },
      ],
      chartTotal: 1432,
      rows: [
        { label: 'Available', value: '724 (50.56%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('available') },
        { label: 'Booked', value: '486 (33.94%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('booked') },
        { label: 'Maintenance', value: '142 (9.92%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('maintenance') },
        { label: 'Inactive', value: '80 (5.59%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('inactive') },
      ],
      goToLabel: 'Go to Carriers',
      onGoToClick: handleRow('carriers-capacity'),
    },
  },
  // --- Shipments (additional) ---
  {
    id: 'shipments-exceptions',
    variant: '3xChart',
    props: {
      title: 'Shipments — Exceptions',
      domainIcon: shipmentsIcon,
      value: '376',
      label: 'Total Shipments Exceptions',
      chartSegments: [
        { value: 99, color: 'var(--chart-1)' },
        { value: 72, color: 'var(--chart-2)' },
        { value: 161, color: 'var(--chart-3)' },
        { value: 44, color: 'var(--chart-4)' },
      ],
      chartTotal: 376,
      rows: [
        { label: 'Date Issues', value: '99 (26.33%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('date-issues') },
        { label: 'Routing Review', value: '72 (19.15%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('routing-review') },
        { label: 'Tender Issues', value: '161 (42.82%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('tender-issues') },
        { label: 'Bid Review', value: '44 (11.70%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('bid-review') },
      ],
      goToLabel: 'Go to Shipments',
      onGoToClick: handleRow('shipments-exceptions'),
    },
  },
  // --- Users section ---
  {
    id: 'users-activity',
    variant: '3xChart',
    props: {
      title: 'Users — Activity',
      domainIcon: userMgmtIcon,
      value: '648',
      label: 'Total User Activity',
      chartSegments: [
        { value: 421, color: 'var(--chart-1)' },
        { value: 142, color: 'var(--chart-2)' },
        { value: 53, color: 'var(--chart-3)' },
        { value: 32, color: 'var(--chart-4)' },
      ],
      chartTotal: 648,
      rows: [
        { label: 'Active', value: '421 (64.97%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('active') },
        { label: 'Idle', value: '142 (21.91%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('idle') },
        { label: 'Locked', value: '53 (8.18%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('locked') },
        { label: 'Pending', value: '32 (4.94%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('pending') },
      ],
      goToLabel: 'Go to Users',
      onGoToClick: handleRow('users-activity'),
    },
  },
  {
    id: 'users-reviews',
    variant: '3xChart',
    props: {
      title: 'Users — Reviews',
      domainIcon: userMgmtIcon,
      value: '218',
      label: 'Total Account Reviews',
      chartSegments: [
        { value: 112, color: 'var(--chart-1)' },
        { value: 41, color: 'var(--chart-2)' },
        { value: 47, color: 'var(--chart-3)' },
        { value: 18, color: 'var(--chart-4)' },
      ],
      chartTotal: 218,
      rows: [
        { label: 'Approved', value: '112 (51.38%)', indicatorColor: 'var(--chart-1)', onClick: handleRow('approved') },
        { label: 'Rejected', value: '41 (18.81%)', indicatorColor: 'var(--chart-2)', onClick: handleRow('rejected') },
        { label: 'In Review', value: '47 (21.56%)', indicatorColor: 'var(--chart-3)', onClick: handleRow('in-review') },
        { label: 'Escalated', value: '18 (8.26%)', indicatorColor: 'var(--chart-4)', onClick: handleRow('escalated') },
      ],
      goToLabel: 'Go to Users',
      onGoToClick: handleRow('users-reviews'),
    },
  },
]

// Default sections seed — groups initial widgets by domain. The user can
// rename, delete, and re-order via edit mode; this is just the on-mount state.
// `widgetIds` is converted to `placements` lazily on Home mount via auto-pack
// (see the useState init), so the file-level constant stays declarative.
const initialSections = [
  {
    id: 'sec-overview',
    name: 'Overview',
    widgetIds: [
      'order-exceptions',
      'um-locked',
      'um-pending',
      'home-quick-actions',
      'carriers-active',
      'um-account-reviews',
      'um-rejected',
    ],
  },
  {
    id: 'sec-shipments',
    name: 'Shipments',
    widgetIds: ['tracking-load-status', 'shipments-monitoring', 'shipments-po-ipgr'],
  },
]

const initialCatalog = [
  {
    id: 'misc',
    title: 'Misc',
    items: [{ id: 'misc-quick-actions', label: 'What would you like to do?', cta: true }],
  },
  {
    id: 'orders',
    title: 'Orders',
    items: [
      { id: 'orders-total', label: 'Total Orders' },
      { id: 'orders-exceptions', label: 'Order Exceptions' },
      { id: 'orders-canceled', label: 'Canceled' },
      { id: 'orders-data-validation', label: 'Data Validation' },
      { id: 'orders-interface-failures', label: 'Interface Failures' },
    ],
  },
  {
    id: 'shipments',
    title: 'Shipments',
    items: [
      { id: 'shipments-total', label: 'Total Shipments' },
      { id: 'shipments-date-issues', label: 'Date Issues' },
      { id: 'shipments-routing-review', label: 'Routing Review' },
      { id: 'shipments-tender-issues', label: 'Tender Issues' },
      { id: 'shipments-pgi-pgr', label: 'PGI/PGR' },
      { id: 'shipments-bid-review', label: 'Bid Review' },
    ],
  },
  {
    id: 'tracking',
    title: 'Tracking',
    items: [
      { id: 'tracking-total', label: 'Total Trackings' },
      { id: 'tracking-enroute', label: 'EnRoute' },
      { id: 'tracking-at-risk-pickup', label: 'At Risk Pickup' },
      { id: 'tracking-at-risk-delivery', label: 'At Risk Delivery' },
      { id: 'tracking-picked-up-on-time', label: 'Picked Up - On Time' },
      { id: 'tracking-delivered-on-time', label: 'Delivered - On-Time' },
      { id: 'tracking-delivered-late', label: 'Delivered - Late' },
    ],
  },
  {
    id: 'carriers',
    title: 'Carriers',
    items: [
      { id: 'carriers-total', label: 'Total Carriers' },
      { id: 'carriers-not-started', label: 'Not Started' },
      { id: 'carriers-delivered', label: 'Delivered' },
    ],
  },
  {
    id: 'user-management',
    title: 'User Management',
    items: [
      { id: 'users-total', label: 'Total Users' },
      { id: 'users-active', label: 'Active' },
      { id: 'users-locked', label: 'Locked' },
      { id: 'users-suspended', label: 'Suspended' },
      { id: 'users-inactive', label: 'Inactive' },
      { id: 'users-deleted', label: 'Deleted' },
      { id: 'users-new-account-review', label: 'New Account Review' },
      { id: 'users-rejected-request', label: 'Rejected Request' },
    ],
  },
]

// Column-span per variant. 1x = 1 col, everything else = 2 cols.
const VARIANT_COLS = { '1x': 1, '2x': 2, '3x': 2, '3xChart': 2, '3xCta': 2 }
// Row-span per variant.
const VARIANT_ROWS = { '1x': 1, '2x': 1, '3x': 2, '3xChart': 2, '3xCta': 2 }
const GRID_COLS = 6
const KEY = (r, c) => `${r}:${c}`

// Build a (row,col) → widgetId map from a section's placements, accounting for
// widgets that span multiple cells.
function buildOccupied(placements, widgetsById) {
  const occupied = new Map()
  for (const p of placements) {
    const w = widgetsById[p.id]
    if (!w) continue
    const cw = VARIANT_COLS[w.variant] || 1
    const rh = VARIANT_ROWS[w.variant] || 1
    for (let dr = 0; dr < rh; dr++) {
      for (let dc = 0; dc < cw; dc++) {
        occupied.set(KEY(p.row + dr, p.col + dc), p.id)
      }
    }
  }
  return occupied
}

// Maximum row index used by any widget (0-based, inclusive). Empty sections
// still render 1 row of placeholders so users have somewhere to drop into.
function computeGridRows(placements, widgetsById) {
  if (placements.length === 0) return 1
  let max = 0
  for (const p of placements) {
    const w = widgetsById[p.id]
    if (!w) continue
    const rh = VARIANT_ROWS[w.variant] || 1
    if (p.row + rh > max) max = p.row + rh
  }
  return Math.max(max, 1)
}

// List of (row, col) positions inside the section's grid that aren't occupied
// by any widget. Each one renders as a droppable placeholder cell.
function computeEmptyCells(placements, widgetsById) {
  const rows = computeGridRows(placements, widgetsById)
  const occupied = buildOccupied(placements, widgetsById)
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (!occupied.has(KEY(r, c))) cells.push({ row: r, col: c })
    }
  }
  return cells
}

// First (row, col) that fits a widget of the given variant. Walks left→right,
// top→bottom and extends the grid downward indefinitely (sections grow as
// widgets are added). Used when seeding initial placements + when inserting
// new widgets via the configurator.
function findFirstFreePosition(placements, widgetsById, variant) {
  const cw = VARIANT_COLS[variant] || 1
  const rh = VARIANT_ROWS[variant] || 1
  const occupied = buildOccupied(placements, widgetsById)
  for (let r = 0; r < 100; r++) {
    for (let c = 0; c <= GRID_COLS - cw; c++) {
      let fits = true
      for (let dr = 0; dr < rh && fits; dr++) {
        for (let dc = 0; dc < cw && fits; dc++) {
          if (occupied.has(KEY(r + dr, c + dc))) fits = false
        }
      }
      if (fits) return { row: r, col: c }
    }
  }
  return { row: 0, col: 0 } // shouldn't reach — fallback
}

// Clamp a target (row, col) so a widget of the given variant fits in the
// grid. Just enforces grid bounds — no minimal-slide preference. Used by
// widget→widget drops where the user explicitly aimed at a target widget,
// so the anchor should land as close to the target as the grid allows.
function clampToGrid(targetRow, targetCol, variant) {
  const cw = VARIANT_COLS[variant] || 1
  const col = Math.max(0, Math.min(targetCol, GRID_COLS - cw))
  const row = Math.max(0, targetRow)
  return { row, col }
}

// Place activeId at newAnchor in `placements`. Every widget (other than
// active) whose footprint overlaps activeId's new footprint is removed from
// its slot and re-packed to the next free position — so dropping a 2x onto
// a row of 1x widgets shoves every overlapped 1x out of the way, not just
// the one directly under the cursor.
//
// `previousActiveAnchor` (optional): when exactly one widget is displaced
// AND a previous anchor is provided AND it fits cleanly, the displaced
// widget takes that vacated slot — preserves the natural swap UX for
// 1x↔1x reorders. For multi-cell collisions or cross-section drops, falls
// back to reading-order repack via findFirstFreePosition.
function placeWithDisplacement(placements, widgetsById, activeId, newAnchor, previousActiveAnchor = null) {
  const w = widgetsById[activeId]
  if (!w) return placements
  const cw = VARIANT_COLS[w.variant] || 1
  const rh = VARIANT_ROWS[w.variant] || 1
  const newCells = new Set()
  for (let dr = 0; dr < rh; dr++) {
    for (let dc = 0; dc < cw; dc++) {
      newCells.add(KEY(newAnchor.row + dr, newAnchor.col + dc))
    }
  }
  const displaced = []
  const surviving = []
  for (const p of placements) {
    if (p.id === activeId) continue
    const pw = widgetsById[p.id]
    if (!pw) { surviving.push(p); continue }
    const pcw = VARIANT_COLS[pw.variant] || 1
    const prh = VARIANT_ROWS[pw.variant] || 1
    let hit = false
    for (let dr = 0; dr < prh && !hit; dr++) {
      for (let dc = 0; dc < pcw && !hit; dc++) {
        if (newCells.has(KEY(p.row + dr, p.col + dc))) hit = true
      }
    }
    ;(hit ? displaced : surviving).push(p)
  }
  const next = [...surviving, { id: activeId, row: newAnchor.row, col: newAnchor.col }]
  if (displaced.length === 1 && previousActiveAnchor) {
    const p = displaced[0]
    const pw = widgetsById[p.id]
    if (pw) {
      const pcw = VARIANT_COLS[pw.variant] || 1
      const prh = VARIANT_ROWS[pw.variant] || 1
      if (previousActiveAnchor.col + pcw <= GRID_COLS && previousActiveAnchor.row >= 0) {
        const oldCells = new Set()
        for (let dr = 0; dr < prh; dr++) {
          for (let dc = 0; dc < pcw; dc++) {
            oldCells.add(KEY(previousActiveAnchor.row + dr, previousActiveAnchor.col + dc))
          }
        }
        let conflict = false
        for (const np of next) {
          if (np.id === activeId) continue
          const npw = widgetsById[np.id]
          if (!npw) continue
          const npcw = VARIANT_COLS[npw.variant] || 1
          const npr = VARIANT_ROWS[npw.variant] || 1
          for (let dr = 0; dr < npr && !conflict; dr++) {
            for (let dc = 0; dc < npcw && !conflict; dc++) {
              if (oldCells.has(KEY(np.row + dr, np.col + dc))) conflict = true
            }
          }
        }
        if (!conflict) {
          next.push({ id: p.id, row: previousActiveAnchor.row, col: previousActiveAnchor.col })
          return next
        }
      }
    }
  }
  displaced.sort((a, b) => a.row - b.row || a.col - b.col)
  for (const p of displaced) {
    const pw = widgetsById[p.id]
    if (!pw) continue
    const pos = findFirstFreePosition(next, widgetsById, pw.variant)
    next.push({ id: p.id, row: pos.row, col: pos.col })
  }
  return next
}

// Seed a placements array from an ordered list of widget ids using auto-pack.
// Used once at mount to convert the legacy widgetIds-style initialSections.
function autoPackFromWidgetIds(widgetIds, widgetsById) {
  const placements = []
  for (const id of widgetIds) {
    const w = widgetsById[id]
    if (!w) continue
    const pos = findFirstFreePosition(placements, widgetsById, w.variant)
    placements.push({ id, row: pos.row, col: pos.col })
  }
  return placements
}

// Inline style for a cell at the given placement, spanning its variant's
// col/row count. Grid lines are 1-indexed.
function gridStyleFor(row, col, colSpan = 1, rowSpan = 1) {
  return {
    gridColumn: `${col + 1} / span ${colSpan}`,
    gridRow: `${row + 1} / span ${rowSpan}`,
  }
}

// Stagger window for the initial mount entry animation (ms). Widgets are
// assigned slots in a shuffled order at Home-level mount; each slot's delay
// is `slot * ENTER_STEP_MS + jitter` where jitter ∈ [0, ENTER_JITTER_MS].
// This guarantees a minimum gap of (STEP - JITTER) ms between any two
// widgets' start times so none ever look simultaneous, while keeping the
// order fresh per page load. Total stagger window for N widgets is
// (N-1)*STEP + JITTER ms; add the 600ms transform duration for the full
// settle time. The MOUNT_ANIMATION_GATE_MS below must cover that window.
const ENTER_STEP_MS = 90
const ENTER_JITTER_MS = 40
const ENTER_DURATION_MS = 600
const MOUNT_ANIMATION_GATE_MS = 1800

// Hero background rotation. The .home-background photo layers cross-fade
// through HERO_IMAGES, advancing every HERO_ROTATE_MS, starting from the
// shared random HERO_INITIAL_INDEX (so Home opens on the same photo Login
// showed). See src/heroImages.js.

// Place a widget so it COVERS the target (row, col) with minimal slide from
// its current position. The widget keeps its full size; only the anchor moves.
//
// Two constraints:
//   1. The widget must cover the target cell — i.e. target ∈ [anchor, anchor+span)
//      So the anchor's valid range is [target - span + 1, target].
//   2. The widget must stay inside the grid (cols 0..GRID_COLS-cw, rows ≥ 0).
//
// Within the intersection of those two ranges, we pick the position CLOSEST
// to the widget's current anchor — so a 2x widget at cols 0-1 dropped on
// placeholder col 2 lands at cols 1-2 (slide of +1, covers col 2), not at
// cols 2-3 (which would skip col 1). For drops further away, the slide grows
// until the widget reaches the edge.
//
// `currentRow` / `currentCol` are the widget's pre-drop position (in any
// section). If undefined (rare), default to the leftmost / topmost valid
// anchor.
function clampPlacement(targetRow, targetCol, variant, currentCol, currentRow) {
  const cw = VARIANT_COLS[variant] || 1
  const rh = VARIANT_ROWS[variant] || 1
  // Column anchor must satisfy: anchor ≤ targetCol < anchor + cw,
  // i.e. anchor ∈ [targetCol - cw + 1, targetCol], clamped to [0, GRID_COLS - cw].
  const colMin = Math.max(0, targetCol - cw + 1)
  const colMax = Math.min(GRID_COLS - cw, targetCol)
  const colAnchor = colMin > colMax ? colMin : colMax // safety; should never invert
  const col = currentCol !== undefined
    ? Math.max(colMin, Math.min(currentCol, colMax))
    : colAnchor
  // Row anchor: same logic, but no upper grid bound (sections grow downward).
  const rowMin = Math.max(0, targetRow - rh + 1)
  const rowMax = Math.max(rowMin, targetRow)
  const row = currentRow !== undefined
    ? Math.max(rowMin, Math.min(currentRow, rowMax))
    : rowMin
  return { row, col }
}

// Droppable placeholder cell — empty grid slot inside a section that accepts a
// dragged widget. The placeholder owns an explicit (row, col); dropping a
// widget on it sets the widget's placement to that exact cell.
function PlaceholderCell({ sectionId, row, col }) {
  const { setNodeRef, isOver } = useDroppable({ id: `placeholder:${sectionId}:${row}:${col}` })
  const classes = [
    'home-widget-cell',
    'home-widget-cell--1x',
    'home-widget-cell--ghost',
    isOver && 'home-widget-cell--ghost-over',
  ].filter(Boolean).join(' ')
  return (
    <div
      ref={setNodeRef}
      className={classes}
      style={gridStyleFor(row, col)}
      aria-hidden="true"
    />
  )
}

// Decorative-only placeholder cell — same look as PlaceholderCell but with no
// useDroppable wiring. Used inside the AddSection preview row (the new section
// hasn't been created yet, so there's no section id to drop into).
function GhostCell() {
  return (
    <div
      className="home-widget-cell home-widget-cell--1x home-widget-cell--ghost"
      aria-hidden="true"
    />
  )
}

function SortableWidget({ widget, placement, sectionId, isEditMode, onRemove, justInserted = false, mountAnimating = false, bgLoaded = true, enterDelayMs = 0 }) {
  const cellRef = useRef(null)
  // Skip the entry animation if this cell is below the fold at mount time.
  // Animating off-screen cells wastes GPU work the user never sees; with
  // many widgets this also makes the visible stagger more legible.
  const [isAboveFold, setIsAboveFold] = useState(true)
  useLayoutEffect(() => {
    if (!cellRef.current) return
    const rect = cellRef.current.getBoundingClientRect()
    if (rect.top > window.innerHeight) setIsAboveFold(false)
  }, [])
  // While the bg image is still downloading, hold widgets invisible (waiting
  // class) so they don't flash in before bg paints. Once bgLoaded, swap to
  // the --enter class which runs the stagger animation.
  const isMountWaiting = mountAnimating && !bgLoaded && isAboveFold
  const shouldAnimateEntry = mountAnimating && bgLoaded && isAboveFold
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: `section:${sectionId}:${widget.id}`,
    disabled: !isEditMode,
    animateLayoutChanges: () => false,
  })

  useEffect(() => {
    if (justInserted && cellRef.current) {
      cellRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [justInserted])

  const mergedRef = (node) => {
    setNodeRef(node)
    cellRef.current = node
  }
  const cw = VARIANT_COLS[widget.variant] || 1
  const rh = VARIANT_ROWS[widget.variant] || 1
  // While dragging, the actual cell becomes a "ghost" (low opacity) so the
  // grid layout stays stable. The visible representation of the dragged
  // widget lives in the parent <DragOverlay> below. No `transform` here —
  // the overlay handles the visual translation, the cell stays put.
  const style = {
    ...gridStyleFor(placement.row, placement.col, cw, rh),
    transition,
    opacity: isDragging ? 0.3 : 1,
  }
  const dragProps = isEditMode ? { ...attributes, ...listeners } : {}
  // Highlight as a swap target when another widget is dragged over this cell
  // (but not when this cell itself is the one being dragged).
  const showSwapHighlight = isOver && !isDragging
  return (
    <div
      ref={mergedRef}
      style={shouldAnimateEntry ? { ...style, '--enter-delay': `${enterDelayMs}ms` } : style}
      className={[
        'home-widget-cell',
        `home-widget-cell--${widget.variant}`,
        showSwapHighlight && 'home-widget-cell--swap-target',
        isMountWaiting && 'home-widget-cell--mount-waiting',
        shouldAnimateEntry && 'home-widget-cell--enter',
      ].filter(Boolean).join(' ')}
      data-just-inserted={justInserted || undefined}
      {...dragProps}
    >
      <Widget
        variant={widget.variant}
        editMode={isEditMode}
        onRemove={() => onRemove(widget.id)}
        chartDelayMs={shouldAnimateEntry ? enterDelayMs + ENTER_DURATION_MS : 0}
        {...widget.props}
      />
    </div>
  )
}

function SortablePanelItem({ item, group, defaultNode, disabled = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `panel:${group.id}:${item.id}`,
    disabled,
  })
  const style = {
    transform: transform ? `translate3d(0, ${transform.y}px, 0)` : undefined,
    transition,
    background: isDragging ? 'var(--deep-sea-neutral-200)' : undefined,
  }
  const dragProps = disabled ? {} : { ...attributes, ...listeners }
  return (
    <div
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging ? 'true' : undefined}
      {...dragProps}
    >
      {defaultNode}
    </div>
  )
}

// Inline rename input — replaces the SectionLabel while editing. The pencil
// + trash actions are replaced by a "Done" Button (link variant, sm) that
// commits the rename.
function SectionRenameInput({ initialValue, onSave, onCancel }) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef(null)
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])
  const commit = () => {
    const trimmed = value.trim()
    if (trimmed) onSave(trimmed)
    else onCancel()
  }
  return (
    <div className="section-label section-label--edit home-section-rename">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); onCancel() }
        }}
        className="home-section-rename__input text-label-sm-medium"
        aria-label="Section name"
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={commit}
        className="home-section-rename__done"
      >
        Done
      </Button>
    </div>
  )
}

export default function Home() {
  const { isEditMode, enterEditMode } = useEditMode()
  const navigate = useNavigate()

  // Edit mode always opens at the top; on exit, restore the scroll the user
  // was at before entering edit. AppShell's <main> owns the scroll.
  const savedHomeScrollRef = useRef(0)
  const prevIsEditModeRef = useRef(isEditMode)
  useEffect(() => {
    const main = document.querySelector('main')
    if (!main) return
    const wasEdit = prevIsEditModeRef.current
    if (!wasEdit && isEditMode) {
      savedHomeScrollRef.current = main.scrollTop
      main.scrollTop = 0
    } else if (wasEdit && !isEditMode) {
      main.scrollTop = savedHomeScrollRef.current
    }
    prevIsEditModeRef.current = isEditMode
  }, [isEditMode])

  // Initial mount: widgets slide up + fade in with staggered delays (see
  // .home-widget-cell--enter in Home.css). Each initially-placed widget gets
  // assigned a slot via a Fisher-Yates shuffle, then delay = slot * STEP +
  // jitter. Stratified slots guarantee no two widgets ever start within
  // (STEP - JITTER) ms of each other → no "simultaneous" feel, but order
  // stays random per page load. After MOUNT_ANIMATION_GATE_MS we drop the
  // --enter class so subsequent re-renders (edit mode, DnD) don't re-animate.
  const [enterDelayMap] = useState(() => {
    const ids = initialSections.flatMap((s) => s.widgetIds)
    // Fisher-Yates shuffle (in-place on a copy).
    const shuffled = [...ids]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return Object.fromEntries(
      shuffled.map((id, i) => [id, i * ENTER_STEP_MS + Math.floor(Math.random() * ENTER_JITTER_MS)]),
    )
  })
  // Background image gates the mount stagger. The widget cells have CSS
  // `animation-fill-mode: backwards` so they sit invisibly at the start frame
  // until --enter is applied. We hold off applying --enter until bg.webp has
  // finished decoding, so widgets and bg appear in lockstep — no flash of
  // already-animating widgets against a plain white background (which would
  // also briefly clash with the on-dark white text styles). Image() picks up
  // the <link rel="preload"> in index.html if already cached. Worst case is
  // a slightly delayed entry on first uncached load.
  const [bgLoaded, setBgLoaded] = useState(() => {
    if (typeof Image === 'undefined') return true
    const img = new Image()
    img.src = HERO_IMAGES[HERO_INITIAL_INDEX]
    return img.complete // cached → true synchronously, skip the waiting state entirely
  })
  useEffect(() => {
    if (bgLoaded) return
    const img = new Image()
    img.src = HERO_IMAGES[HERO_INITIAL_INDEX]
    if (img.complete) {
      setBgLoaded(true)
      return
    }
    const onDone = () => setBgLoaded(true)
    img.addEventListener('load', onDone)
    img.addEventListener('error', onDone) // don't strand the page on a 404
    // Safety net: never block widgets longer than 1.5s even on a slow network.
    const fallback = setTimeout(onDone, 1500)
    return () => {
      img.removeEventListener('load', onDone)
      img.removeEventListener('error', onDone)
      clearTimeout(fallback)
    }
  }, [])

  const [isMountAnimating, setIsMountAnimating] = useState(true)
  useEffect(() => {
    if (!bgLoaded) return
    const t = setTimeout(() => setIsMountAnimating(false), MOUNT_ANIMATION_GATE_MS)
    return () => clearTimeout(t)
  }, [bgLoaded])

  // Rotate the hero photo every HERO_ROTATE_MS. All HERO_IMAGES layers stay
  // mounted (stacked in .home-background); only the active one is opaque, so
  // the swap is a CSS opacity cross-fade. Starts once the first image is in.
  const [heroIndex, setHeroIndex] = useState(HERO_INITIAL_INDEX)
  useEffect(() => {
    if (!bgLoaded || HERO_IMAGES.length < 2) return
    const id = setInterval(
      () => setHeroIndex((i) => (i + 1) % HERO_IMAGES.length),
      HERO_ROTATE_MS,
    )
    return () => clearInterval(id)
  }, [bgLoaded])

  const ctaRows = useMemo(
    () => [
      { icon: <Plus size={20} />, label: 'Go to Create a New Order', onClick: () => navigate('/orders') },
      { icon: <Route size={20} />, label: 'Track a Shipment', onClick: () => navigate('/tracking') },
      { icon: <UserCog size={20} />, label: 'Management Users', onClick: () => navigate('/users') },
      { icon: <Download size={20} />, label: 'Invoices', onClick: () => {} },
    ],
    [navigate],
  )

  const [widgets, setWidgets] = useState(() =>
    initialWidgets.map((w) => {
      if (w.id === 'home-quick-actions') {
        return { ...w, props: { ...w.props, ctaRows } }
      }
      const target = widgetGoToPaths[w.id]
      if (target) {
        return { ...w, props: { ...w.props, onGoToClick: () => navigate(target) } }
      }
      return w
    }),
  )

  // On fetch success, fill the tracking-load-status widget with live
  // load-statistics from the Odyssey Tracking platform. The widget's own
  // zero/empty state stays visible until then (and on failure — network,
  // auth, schema) — so nothing stale flashes before the real numbers arrive.
  const { data: trackingData } = useTrackingLoadStatistics()
  useEffect(() => {
    if (!trackingData?.statuses) return
    const countOf = (status) =>
      trackingData.statuses.find((s) => s.status === status)?.count ?? 0
    const sched = countOf('Scheduled P/U Today')
    const enroute = countOf('EnRoute')
    const delivered = countOf('Delivered')
    const atRisk = countOf('At Risk')
    const total = countOf('All shipments')
    setWidgets((prev) =>
      prev.map((w) =>
        w.id === 'tracking-load-status'
          ? {
              ...w,
              props: {
                ...w.props,
                // Fill the zero-state tracking-load-status widget with live
                // numbers. Title / label / goToLabel / onGoToClick already
                // come from the widget's own definition (+ widgetGoToPaths).
                value: total.toLocaleString(),
                rows: [
                  { label: 'Scheduled P/U Today', value: sched.toLocaleString(), indicatorColor: 'var(--chart-1)', onClick: handleRow('scheduled-pu') },
                  { label: 'EnRoute', value: enroute.toLocaleString(), indicatorColor: 'var(--chart-2)', onClick: handleRow('enroute') },
                  { label: 'Delivered', value: delivered.toLocaleString(), indicatorColor: 'var(--chart-3)', onClick: handleRow('delivered') },
                  { label: 'At Risk', value: atRisk.toLocaleString(), indicatorColor: 'var(--chart-4)', onClick: handleRow('at-risk') },
                ],
                chartSegments: [
                  { value: sched, color: 'var(--chart-1)' },
                  { value: enroute, color: 'var(--chart-2)' },
                  { value: delivered, color: 'var(--chart-3)' },
                  { value: atRisk, color: 'var(--chart-4)' },
                ],
                chartTotal: sched + enroute + delivered + atRisk,
              },
            }
          : w,
      ),
    )
  }, [trackingData])

  // Sections seeded from initialSections — widgetIds auto-packed into
  // explicit (row, col) placements so the grid layout is position-aware
  // from the start (vs. CSS auto-flow packing).
  const [sections, setSections] = useState(() => {
    const widgetsById = {}
    for (const w of initialWidgets) widgetsById[w.id] = w
    return initialSections.map((s) => ({
      id: s.id,
      name: s.name,
      placements: autoPackFromWidgetIds(s.widgetIds, widgetsById),
    }))
  })
  const [renamingSectionId, setRenamingSectionId] = useState(null)
  const [deletingSectionId, setDeletingSectionId] = useState(null)
  const [catalog, setCatalog] = useState(initialCatalog)
  const [searchValue, setSearchValue] = useState('')
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(new Set())
  const [gridKey, setGridKey] = useState(0)
  // Customer selection is global (owned by CustomersContext, triggered from the
  // navbar handshake). Home is just a consumer: it reads selectedIds to gate
  // widget data.
  const { selectedIds } = useCustomers()

  // Configurator modal — also tracks which section the new widget should land in.
  const [configurator, setConfigurator] = useState(null)
  const [lastInsertedId, setLastInsertedId] = useState(null)
  const [scrollToSectionId, setScrollToSectionId] = useState(null)
  // Active drag — widget id of the currently-dragged widget (for DragOverlay).
  const [activeDragWidgetId, setActiveDragWidgetId] = useState(null)
  // Per-section refs for scroll-into-view on add/rename.
  const sectionRefs = useRef({})
  const registerSectionRef = useCallback((id, node) => {
    if (node) sectionRefs.current[id] = node
    else delete sectionRefs.current[id]
  }, [])

  useEffect(() => {
    if (!lastInsertedId) return
    const t = setTimeout(() => setLastInsertedId(null), 900)
    return () => clearTimeout(t)
  }, [lastInsertedId])

  useEffect(() => {
    if (!scrollToSectionId) return
    const node = sectionRefs.current[scrollToSectionId]
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setScrollToSectionId(null)
  }, [scrollToSectionId])

  const hasCtaWidget = useMemo(
    () => widgets.some((w) => w.variant === '3xCta'),
    [widgets],
  )
  const isItemDisabled = useCallback(
    (item) => Boolean(item?.cta && hasCtaWidget),
    [hasCtaWidget],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // Cursor-driven collision detection — the drop target is the cell the
  // CURSOR is inside, not the cell closest to the dragged widget's center.
  // This matters for multi-col widgets: closestCenter measures the active
  // rect's center, which for a 2x widget grabbed near its left edge sits
  // ~one cell to the right of the cursor — causing right-drags to land one
  // cell beyond the visually highlighted target. pointerWithin solves this
  // by tracking the pointer directly. Falls back to closestCorners when the
  // pointer is in the grid gap (no droppable directly under it).
  const collisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return closestCorners(args)
  }, [])

  const widgetsById = useMemo(() => {
    const m = {}
    for (const w of widgets) m[w.id] = w
    return m
  }, [widgets])

  // Zero-out widget data when no customers are selected (CTA widgets pass through).
  const hasCustomers = selectedIds.size > 0
  const widgetsById_render = useMemo(() => {
    if (hasCustomers) return widgetsById
    const out = {}
    for (const w of widgets) {
      if (w.variant === '3xCta') { out[w.id] = w; continue }
      const p = { ...w.props }
      if ('value' in p) p.value = '0'
      if ('percentage' in p) p.percentage = '0%'
      if (Array.isArray(p.chartSegments)) p.chartSegments = []
      if (Array.isArray(p.rows)) p.rows = p.rows.map((r) => ({ ...r, value: '0' }))
      out[w.id] = { ...w, props: p }
    }
    return out
  }, [widgets, widgetsById, hasCustomers])

  // Flat list of sortable IDs for the cross-section widget DndContext.
  const widgetSortIds = useMemo(
    () => sections.flatMap((s) => s.placements.map((p) => `section:${s.id}:${p.id}`)),
    [sections],
  )

  const panelItemIds = useMemo(
    () => catalog.flatMap((g) => g.items.map((it) => `panel:${g.id}:${it.id}`)),
    [catalog],
  )

  const handleAddWidgets = () => {
    const widgetsSnapshot = widgets
    const sectionsSnapshot = sections
    const catalogSnapshot = catalog
    enterEditMode({
      onSave: () => {
        setGridKey((k) => k + 1)
      },
      onCancel: () => {
        setWidgets(widgetsSnapshot)
        setSections(sectionsSnapshot)
        setCatalog(catalogSnapshot)
      },
    })
  }

  const handleRemoveWidget = useCallback((id) => {
    setWidgets((current) => current.filter((w) => w.id !== id))
    setSections((current) =>
      current.map((s) => ({ ...s, placements: s.placements.filter((p) => p.id !== id) })),
    )
  }, [])

  // --- Section CRUD --------------------------------------------------------

  const generateSectionId = () => `sec-${Date.now()}`

  const handleAddSectionAtEnd = useCallback(() => {
    const id = generateSectionId()
    setSections((current) => [...current, { id, name: 'New section', placements: [] }])
    setRenamingSectionId(id)
    setScrollToSectionId(id)
  }, [])

  const handleStartRename = useCallback((sectionId) => {
    setRenamingSectionId(sectionId)
  }, [])
  const handleSaveRename = useCallback((sectionId, newName) => {
    setSections((current) => current.map((s) => (s.id === sectionId ? { ...s, name: newName } : s)))
    setRenamingSectionId(null)
  }, [])
  const handleCancelRename = useCallback(() => {
    setRenamingSectionId(null)
  }, [])

  const handleDeleteSectionRequest = useCallback((sectionId) => {
    setDeletingSectionId(sectionId)
  }, [])
  const handleConfirmDeleteSection = useCallback(() => {
    if (!deletingSectionId) return
    setSections((current) => {
      const target = current.find((s) => s.id === deletingSectionId)
      if (!target) return current
      // Cascade-delete every widget that belonged to the section.
      const idsToRemove = new Set(target.placements.map((p) => p.id))
      setWidgets((ws) => ws.filter((w) => !idsToRemove.has(w.id)))
      return current.filter((s) => s.id !== deletingSectionId)
    })
    setDeletingSectionId(null)
  }, [deletingSectionId])

  // --- Panel + item picker -------------------------------------------------

  const handleToggleGroup = useCallback((groupId) => {
    setCollapsedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const handleItemClick = useCallback((itemId, groupId) => {
    const group = catalog.find((g) => g.id === groupId)
    const item = group?.items.find((it) => it.id === itemId)
    if (!item) return
    // Default destination: last section. If no sections exist, the configurator
    // disables the Insert button.
    const lastSectionId = sections.length > 0 ? sections[sections.length - 1].id : null
    if (item.cta) {
      if (hasCtaWidget) {
        const existing = widgets.find((w) => w.variant === '3xCta')
        if (existing) setLastInsertedId(existing.id)
        return
      }
      // CTA bypasses the variant picker (only one variant) and starts
      // directly at step 2 — the section selector.
      setConfigurator({
        itemId: item.id,
        itemLabel: item.label,
        groupTitle: group.title,
        variant: '3xCta',
        cta: true,
        sectionId: lastSectionId,
        step: 2,
      })
      return
    }
    // Non-CTA: step 1 = variant picker, step 2 = section selector.
    setConfigurator({
      itemId: item.id,
      itemLabel: item.label,
      groupTitle: group.title,
      variant: '1x',
      cta: false,
      sectionId: lastSectionId,
      step: 1,
    })
  }, [catalog, hasCtaWidget, widgets, sections])

  const handleInsertWidget = useCallback(() => {
    if (!configurator) return
    const { itemId, itemLabel, variant, cta, sectionId } = configurator
    if (!sectionId) return
    const placeholderProps = cta
      ? { title: itemLabel, ctaRows }
      : variant === '3xChart'
        ? { title: itemLabel, domainIcon, value: '0', label: 'No data yet', rows: chartRows, chartSegments }
        : variant === '3x'
          ? { title: itemLabel, domainIcon, rows: exceptionRows, goToLabel: `Go to ${itemLabel}`, onGoToClick: () => {} }
          : variant === '2x'
            ? { title: itemLabel, domainIcon, value: '0', label: 'No data yet', percentage: '0%', chartSegments: singleChartSegment, chartTotal: 100, goToLabel: `Go to ${itemLabel}`, onGoToClick: () => {} }
            : { title: itemLabel, domainIcon, value: '0', label: 'No data yet', onGoToClick: () => {} }
    const newWidget = {
      id: `${itemId}-${Date.now()}`,
      variant,
      props: placeholderProps,
    }
    setWidgets((current) => [...current, newWidget])
    // Auto-pack the new widget into the first free position of the target section.
    setSections((current) =>
      current.map((s) => {
        if (s.id !== sectionId) return s
        const widgetsById = {}
        // Build local lookup including the new widget so findFirstFreePosition
        // can read its variant.
        for (const w of widgets) widgetsById[w.id] = w
        widgetsById[newWidget.id] = newWidget
        const pos = findFirstFreePosition(s.placements, widgetsById, newWidget.variant)
        return {
          ...s,
          placements: [...s.placements, { id: newWidget.id, row: pos.row, col: pos.col }],
        }
      }),
    )
    setLastInsertedId(newWidget.id)
    setConfigurator(null)
  }, [configurator, ctaRows, widgets])

  // --- Drag start / end ----------------------------------------------------

  const handleDragStart = (event) => {
    const id = String(event.active.id)
    if (id.startsWith('section:')) {
      const [, , widgetId] = id.split(':')
      setActiveDragWidgetId(widgetId)
    }
  }

  const handleDragCancel = () => setActiveDragWidgetId(null)

  const handleDragEnd = (event) => {
    setActiveDragWidgetId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = String(active.id)
    const overId = String(over.id)

    // Widget drag → widget drag. Active lands at the target widget's anchor
    // (clamped to grid bounds); every existing widget whose footprint overlaps
    // active's new footprint is repacked out of the way via placeWithDisplacement.
    // IDs: `section:<sectionId>:<widgetId>`.
    if (activeId.startsWith('section:') && overId.startsWith('section:')) {
      const [, aSec, aWid] = activeId.split(':')
      const [, oSec, oWid] = overId.split(':')
      const draggedWidget = widgets.find((w) => w.id === aWid)
      if (!draggedWidget) return
      setSections((current) => {
        const wbi = {}
        for (const w of widgets) wbi[w.id] = w
        if (aSec === oSec) {
          return current.map((s) => {
            if (s.id !== aSec) return s
            const targetP = s.placements.find((p) => p.id === oWid)
            const activeP = s.placements.find((p) => p.id === aWid)
            if (!targetP || !activeP) return s
            const newAnchor = clampToGrid(targetP.row, targetP.col, draggedWidget.variant)
            return {
              ...s,
              placements: placeWithDisplacement(
                s.placements,
                wbi,
                aWid,
                newAnchor,
                { row: activeP.row, col: activeP.col },
              ),
            }
          })
        }
        // Cross-section: remove from source, place in target with displacement.
        return current.map((s) => {
          if (s.id === aSec) {
            return { ...s, placements: s.placements.filter((p) => p.id !== aWid) }
          }
          if (s.id === oSec) {
            const targetP = s.placements.find((p) => p.id === oWid)
            if (!targetP) return s
            const newAnchor = clampToGrid(targetP.row, targetP.col, draggedWidget.variant)
            return {
              ...s,
              placements: placeWithDisplacement(s.placements, wbi, aWid, newAnchor, null),
            }
          }
          return s
        })
      })
      return
    }

    // Widget dropped onto a placeholder cell — IDs are `placeholder:<sectionId>:<row>:<col>`.
    if (activeId.startsWith('section:') && overId.startsWith('placeholder:')) {
      const [, aSec, aWid] = activeId.split(':')
      const [, targetSec, rowStr, colStr] = overId.split(':')
      const draggedWidget = widgets.find((w) => w.id === aWid)
      if (!draggedWidget) return
      // Find the widget's current placement so we can compute a minimal slide
      // toward the target cell (see clampPlacement docs).
      const sourceSection = sections.find((s) => s.id === aSec)
      const sourcePlacement = sourceSection?.placements.find((p) => p.id === aWid)
      const { row: targetRow, col: targetCol } = clampPlacement(
        Number(rowStr),
        Number(colStr),
        draggedWidget.variant,
        sourcePlacement?.col,
        sourcePlacement?.row,
      )
      setSections((current) => {
        const wbi = {}
        for (const w of widgets) wbi[w.id] = w
        const newAnchor = { row: targetRow, col: targetCol }
        // Same-section: move active to drop position; any widgets the clamped
        // anchor overlaps are repacked. clampPlacement's minimal-slide might
        // still land active on top of unrelated widgets (it only knows about
        // grid bounds + target cell), so displacement is needed here too.
        if (aSec === targetSec) {
          return current.map((s) => {
            if (s.id !== aSec) return s
            return {
              ...s,
              placements: placeWithDisplacement(
                s.placements,
                wbi,
                aWid,
                newAnchor,
                sourcePlacement ? { row: sourcePlacement.row, col: sourcePlacement.col } : null,
              ),
            }
          })
        }
        // Cross-section: remove from source, place in target with displacement.
        return current.map((s) => {
          if (s.id === aSec) {
            return { ...s, placements: s.placements.filter((p) => p.id !== aWid) }
          }
          if (s.id === targetSec) {
            return {
              ...s,
              placements: placeWithDisplacement(s.placements, wbi, aWid, newAnchor, null),
            }
          }
          return s
        })
      })
      return
    }

    // Panel item drag — IDs are `panel:<groupId>:<itemId>`.
    if (activeId.startsWith('panel:') && overId.startsWith('panel:')) {
      const [, activeGroupId] = activeId.split(':')
      const [, overGroupId] = overId.split(':')
      if (activeGroupId !== overGroupId) return
      setCatalog((current) =>
        current.map((group) => {
          if (group.id !== activeGroupId) return group
          const itemIds = group.items.map((it) => `panel:${group.id}:${it.id}`)
          const from = itemIds.indexOf(activeId)
          const to = itemIds.indexOf(overId)
          if (from === -1 || to === -1) return group
          return { ...group, items: arrayMove(group.items, from, to) }
        }),
      )
    }
  }

  const deletingSection = useMemo(
    () => sections.find((s) => s.id === deletingSectionId) || null,
    [sections, deletingSectionId],
  )

  return (
    <AppShell>
      <div className={`home-content ${isEditMode ? 'home-content--edit' : ''}`.trim()}>
        {/* Hero background — composed port-at-dusk effect (see .home-background
            in Home.css): each photo layer is masked to fade out, with a DSN/900
            COLOR-blend tint band (::after) over a DSN/50 base — all image-
            agnostic. The layers cross-fade through HERO_IMAGES every 2 min.
            Anchored at the top of the scrollable Home content so foreground
            text stays in lockstep with the bg it sits on. */}
        <div className="home-background" aria-hidden="true">
          {HERO_IMAGES.map((src, i) => (
            <div
              key={src}
              className="home-background__photo"
              style={{
                backgroundImage: `url(${src})`,
                backgroundPosition: heroPosition(src),
                opacity: i === heroIndex ? 1 : 0,
              }}
            />
          ))}
        </div>
      {!isEditMode && (
        <>
          <PageHeader title="Home" className="home-page-header home-on-dark" />
          {/* Edit Dashboard View — pinned, right-aligned, pulled up to sit on
              the "Home" PageHeader row. position: sticky keeps it reachable as
              widgets scroll (sticky parent is .home-content, full page height). */}
          <div className="home-sticky-actions">
            <Button
              variant="primary"
              size="md"
              icon={<Plus />}
              onClick={handleAddWidgets}
            >
              {widgets.length === 0 ? 'Add Widgets' : 'Edit Dashboard View'}
            </Button>
          </div>
          <SectionHeader
            title="Welcome Amy!"
            supportingText="Last update: 04/24/2026 03:51 PM"
            className="home-on-dark"
          />
        </>
      )}
      {isEditMode && (
        <div className="home-edit-actions">
          <Button
            variant="secondary"
            size="md"
            onClick={handleAddSectionAtEnd}
          >
            Add Section
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={widgetSortIds} strategy={rectSortingStrategy}>
          <div
            key={gridKey}
            className={`home-sections ${isEditMode ? 'home-sections--edit' : ''}`.trim()}
          >
            {sections.length === 0 && !isEditMode && (
              <EmptyState
                className="home-sections-empty"
                icon={<Plus size={32} />}
                message="No sections yet. Switch to edit mode to add one."
              />
            )}
            {sections.map((section, sectionIdx) => {
              const isRenaming = renamingSectionId === section.id
              // Resolve placements → render data (widget + placement).
              const placedWidgets = section.placements
                .map((p) => {
                  const widget = widgetsById_render[p.id]
                  return widget ? { widget, placement: p } : null
                })
                .filter(Boolean)
              // Empty (row, col) cells inside the section's grid extent.
              const emptyCells = isEditMode
                ? computeEmptyCells(section.placements, widgetsById_render)
                : []
              // Default mode shows just enough rows to fit the widgets; edit
              // mode also uses the same rows count so placeholders + widgets
              // align in the same grid.
              const gridRows = computeGridRows(section.placements, widgetsById_render)
              // The first section sits over the dark portion of the home
              // background gradient — its label needs white text for
              // contrast. Lower sections sit over the lighter portion.
              const isOnDark = !isEditMode && sectionIdx === 0
              return (
                <div
                  key={section.id}
                  ref={(node) => registerSectionRef(section.id, node)}
                  className="home-section"
                >
                  {isRenaming ? (
                    <SectionRenameInput
                      initialValue={section.name}
                      onSave={(name) => handleSaveRename(section.id, name)}
                      onCancel={handleCancelRename}
                    />
                  ) : (
                    <SectionLabel
                      className={isOnDark ? 'home-on-dark' : ''}
                      label={section.name}
                      mode={isEditMode ? 'edit' : 'default'}
                      onEdit={isEditMode ? () => handleStartRename(section.id) : undefined}
                      onDelete={isEditMode ? () => handleDeleteSectionRequest(section.id) : undefined}
                    />
                  )}
                  <div
                    className="home-widget-grid"
                    style={{
                      gridTemplateRows: `repeat(${gridRows}, minmax(var(--home-grid-row-min-height), auto))`,
                    }}
                  >
                    {placedWidgets.map(({ widget, placement }) => (
                      <SortableWidget
                        key={widget.id}
                        widget={widget}
                        placement={placement}
                        sectionId={section.id}
                        isEditMode={isEditMode}
                        onRemove={handleRemoveWidget}
                        justInserted={widget.id === lastInsertedId}
                        mountAnimating={isMountAnimating}
                        bgLoaded={bgLoaded}
                        enterDelayMs={enterDelayMap[widget.id] ?? 0}
                      />
                    ))}
                    {emptyCells.map((cell) => (
                      <PlaceholderCell
                        key={`empty-${cell.row}-${cell.col}`}
                        sectionId={section.id}
                        row={cell.row}
                        col={cell.col}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
            {isEditMode && (
              <>
                <AddSectionDivider />
                {/* Preview row of 6 placeholder cells — shows what the new
                    section's grid space will look like. Decorative only;
                    these cells aren't droppable since the section doesn't
                    exist yet (use the AddSectionButton to create it first). */}
                <div className="home-widget-grid home-add-section-preview">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <GhostCell key={`preview-${i}`} />
                  ))}
                </div>
                <AddSectionButton onClick={handleAddSectionAtEnd} />
              </>
            )}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null} className="home-widget-drag-overlay">
          {activeDragWidgetId && widgetsById_render[activeDragWidgetId] ? (
            <Widget
              variant={widgetsById_render[activeDragWidgetId].variant}
              editMode={isEditMode}
              {...widgetsById_render[activeDragWidgetId].props}
            />
          ) : null}
        </DragOverlay>

        <aside
          className={`home-edit-panel ${isEditMode ? 'home-edit-panel--visible' : ''}`.trim()}
          aria-hidden={!isEditMode}
        >
          <SortableContext items={panelItemIds} strategy={verticalListSortingStrategy}>
            <WidgetsLeftMenu
              groups={catalog}
              searchValue={searchValue}
              onSearchChange={setSearchValue}
              collapsedGroupIds={collapsedGroupIds}
              onToggleGroup={handleToggleGroup}
              onItemClick={handleItemClick}
              isItemDisabled={isItemDisabled}
              renderItem={(item, group, defaultNode, meta) => (
                <SortablePanelItem
                  item={item}
                  group={group}
                  defaultNode={defaultNode}
                  disabled={meta?.disabled}
                />
              )}
            />
          </SortableContext>
        </aside>
      </DndContext>
      </div>

      {configurator && configurator.step === 1 && (
        <ModalLarge
          title={configurator.itemLabel}
          subtitle={configurator.groupTitle}
          onClose={() => setConfigurator(null)}
          footer={
            <Button
              variant="primary"
              size="lg"
              onClick={() =>
                setConfigurator((prev) => (prev ? { ...prev, step: 2 } : prev))
              }
              className="home-configurator__insert"
            >
              Continue
            </Button>
          }
        >
          <WidgetVariantPicker
            variant={configurator.variant}
            onVariantChange={(next) =>
              setConfigurator((prev) => (prev ? { ...prev, variant: next } : prev))
            }
            widgetProps={previewWidgetProps(configurator.variant, configurator.itemLabel)}
          />
        </ModalLarge>
      )}
      {configurator && configurator.step === 2 && (() => {
        const selectedSection = sections.find((s) => s.id === configurator.sectionId)
        const addLabel = selectedSection ? `Add to ${selectedSection.name}` : 'Add to section'
        return (
        <ModalLarge
          title={configurator.itemLabel}
          subtitle={configurator.groupTitle}
          onClose={() => setConfigurator(null)}
          footer={
            <div className="home-configurator__step2-actions">
              {!configurator.cta && (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() =>
                    setConfigurator((prev) => (prev ? { ...prev, step: 1 } : prev))
                  }
                >
                  Back
                </Button>
              )}
              <Button
                variant="primary"
                size="lg"
                onClick={handleInsertWidget}
                disabled={!configurator.sectionId}
                className="home-configurator__insert"
              >
                {addLabel}
              </Button>
            </div>
          }
        >
          {sections.length === 0 ? (
            <EmptyState
              icon={<Plus size={32} />}
              message="No sections yet. Close this modal and add one first."
            />
          ) : (
            <div
              className="home-section-picker"
              role="radiogroup"
              aria-label="Section"
            >
              {sections.map((s) => {
                const selected = configurator.sectionId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    className={`home-section-picker__row ${selected ? 'home-section-picker__row--selected' : ''}`.trim()}
                    onClick={() =>
                      setConfigurator((prev) => (prev ? { ...prev, sectionId: s.id } : prev))
                    }
                  >
                    <span className="text-label-sm-medium">{s.name}</span>
                    {selected && <Check size={20} />}
                  </button>
                )
              })}
            </div>
          )}
        </ModalLarge>
        )
      })()}
      {deletingSection && (
        <ModalMedium
          title="Delete section?"
          onClose={() => setDeletingSectionId(null)}
          footer={
            <>
              <Button variant="secondary" size="lg" onClick={() => setDeletingSectionId(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="lg" onClick={handleConfirmDeleteSection}>
                Delete section
              </Button>
            </>
          }
        >
          <p className="home-section-delete-copy text-label-sm-regular">
            Deleting <strong>{deletingSection.name}</strong> will also remove{' '}
            <strong>{deletingSection.placements.length}</strong>{' '}
            {deletingSection.placements.length === 1 ? 'widget' : 'widgets'} inside it. This cannot be undone.
          </p>
        </ModalMedium>
      )}
    </AppShell>
  )
}
