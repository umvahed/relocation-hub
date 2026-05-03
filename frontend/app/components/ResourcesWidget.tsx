'use client'

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

interface Props {
  profile: {
    destination_city?: string | null
    has_children?: boolean
    number_of_children?: number | null
  }
}

export default function ResourcesWidget({ profile }: Props) {
  const city = profile.destination_city || ''
  const hasChildren = profile.has_children ?? false
  const numChildren = profile.number_of_children ?? 0
  const housingUrl = parariusUrl(city || 'amsterdam', 1, hasChildren ? numChildren : 0)
  const cityLabel = city
    ? city === 'den-haag' ? 'Den Haag' : city.charAt(0).toUpperCase() + city.slice(1)
    : 'the Netherlands'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Resources</h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Curated links for your move to {cityLabel}.</p>

      <div className="space-y-3">
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
          <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 ml-auto flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        {hasChildren && (
          <a
            href="https://expatguide.nl/education/bilingual-schools-netherlands/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-700 transition group"
          >
            <span className="text-xl leading-none mt-0.5">🎓</span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                Bilingual schools guide
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                International & bilingual schools in the Netherlands
              </p>
            </div>
            <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 ml-auto flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}
