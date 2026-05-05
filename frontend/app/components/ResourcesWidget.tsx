'use client'
import { useState } from 'react'

const CITY_PARARIUS: Record<string, string> = {
  amsterdam: 'amsterdam',
  rotterdam: 'rotterdam',
  'den-haag': 'den-haag',
  utrecht: 'utrecht',
  eindhoven: 'eindhoven',
}

function parariusUrl(city: string, numberOfAdults: number, numberOfChildren: number): string {
  const total = numberOfAdults + numberOfChildren
  const bedrooms = total <= 1 ? 1 : total <= 3 ? 2 : total <= 5 ? 3 : 4
  const slug = CITY_PARARIUS[city] || 'amsterdam'
  return `https://www.pararius.com/apartments/${slug}/apartment/${bedrooms}-bedrooms`
}

const ExternalIcon = () => (
  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 ml-auto flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
)

interface Props {
  profile: {
    destination_city?: string | null
    has_children?: boolean
    number_of_children?: number | null
    shipping_type?: string | null
  }
}

export default function ResourcesWidget({ profile }: Props) {
  const [collapsed, setCollapsed] = useState(true)

  const city = profile.destination_city || ''
  const hasChildren = profile.has_children ?? false
  const numChildren = profile.number_of_children ?? 0
  const hasContainer = profile.shipping_type === 'container' || profile.shipping_type === 'both'
  const housingUrl = parariusUrl(city || 'amsterdam', 1, hasChildren ? numChildren : 0)
  const cityLabel = city
    ? city === 'den-haag' ? 'Den Haag' : city.charAt(0).toUpperCase() + city.slice(1)
    : 'the Netherlands'

  const linkCount = 2 + (hasChildren ? 1 : 0) + (hasContainer ? 2 : 0)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Resources</h3>
          {collapsed && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {linkCount} links
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Links */}
      {!collapsed && (
        <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">Curated links for your move to {cityLabel}.</p>

          <a
            href={housingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition group"
          >
            <span className="text-xl leading-none mt-0.5">🏠</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                Find apartments on Pararius
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {city ? `Listings in ${cityLabel}` : 'Listings across the Netherlands'}{hasChildren && numChildren > 0 ? `, ${1 + numChildren}-bedroom size` : ''}
              </p>
            </div>
            <ExternalIcon />
          </a>

          <a
            href="https://www.rdw.nl/en/motor-vehicle/driving-licence/exchange-foreign-driving-licence"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition group"
          >
            <span className="text-xl leading-none mt-0.5">🚗</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                Exchange your driving licence — RDW
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                You have 185 days from municipality registration — rules vary by country
              </p>
            </div>
            <ExternalIcon />
          </a>

          {hasChildren && (
            <a href="https://expatguide.nl/education/bilingual-schools-netherlands/" target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition group">
              <span className="text-xl leading-none mt-0.5">🎓</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Bilingual schools guide</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">International & bilingual schools in the Netherlands</p>
              </div>
              <ExternalIcon />
            </a>
          )}

          {hasContainer && (
            <a href="https://www.marktplaats.nl/l/huis-en-inrichting/" target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition group">
              <span className="text-xl leading-none mt-0.5">📦</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Marktplaats — second-hand furniture</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Buy essentials while your container is in transit</p>
              </div>
              <ExternalIcon />
            </a>
          )}

          {hasContainer && (
            <a href="https://www.ikea.com/nl/en/" target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition group">
              <span className="text-xl leading-none mt-0.5">🛋️</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">IKEA Netherlands</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">New furniture & essentials for your Dutch home</p>
              </div>
              <ExternalIcon />
            </a>
          )}
        </div>
      )}
    </div>
  )
}
