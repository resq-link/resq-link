type BarangayGeojson = Record<string, unknown>

let barangayGeojsonPromise: Promise<BarangayGeojson | null> | null = null

export function loadBarangayGeojson(): Promise<BarangayGeojson | null> {
  if (!barangayGeojsonPromise) {
    barangayGeojsonPromise = fetch('/tuguegarao-barangays.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load barangay polygons (${response.status})`)
        }
        return response.json() as Promise<BarangayGeojson>
      })
      .catch((error) => {
        console.error('Error loading barangay polygons:', error)
        barangayGeojsonPromise = null
        return null
      })
  }

  return barangayGeojsonPromise
}
