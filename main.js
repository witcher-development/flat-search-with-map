const SHOW_MAP_LOCAL_STORE = "flatSearch_show-map"

const showAutoOpenMap = () => localStorage.getItem(SHOW_MAP_LOCAL_STORE) === "true"
const setMapAutoShow = (value) => localStorage.setItem(SHOW_MAP_LOCAL_STORE, value) 

let map = null

const createMap = () => {
	if (map !== null) {
		hideMap()
	}

	document.body.classList.add("flatSearch_bodyOffset")
	document.body.insertAdjacentHTML('beforeend', '<div id="flatSearch_mapElement"></div>')
	map = L.map('flatSearch_mapElement').setView([48.144, 17.113], 15);

	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);
}
const hideMap = () => {
	map.off()
	map.remove()
	map = null
	document.querySelector('#flatSearch_mapElement').remove()
	document.body.classList.remove("flatSearch_bodyOffset")
}

const loadingClass = 'flatSearch_loading'
const loadingTemplate = `
	<div class="${loadingClass}">
		<div class="flatSearch_loading-bar">
	</div>
`
const showLoading = () => {
	document.body.insertAdjacentHTML('beforeend', loadingTemplate)
}
const hideLoading = () => {
	document.querySelector(`.${loadingClass}`).remove()	
}

const icon = L.icon({
	iconUrl: chrome.runtime.getURL("images/marker-icon.png")
})

const genMarker = (lat, lng, link, text) => {
  return L.marker([lat, lng], { icon })
    .bindPopup(
      `<a 
            href="${encodeURI(link)}" 
            target="_blank"
         >
            ${text}
        </a>`
    );
}

const drawMarkers = async () => {
	const config = getConfig()

	showLoading()
	const data = await config.getMarkersData()
	hideLoading()

	data.forEach(({ lat, lng, link, text }) => genMarker(lat, lng, link, text).addTo(map))
}


const hideButtonClass = 'flatSearch_hideMapButton'
const hideButtonTemplate = `
	<button class="${hideButtonClass}">
		X
	</button>
`
const hideButtonHandler = () => {
	hideMap()
	const button = document.querySelector(`.${hideButtonClass}`)
	button.removeEventListener('click', hideButtonHandler)
	button.remove()

	showButton()

	setMapAutoShow(false)
}

const hideButton = () => {
	document.body.insertAdjacentHTML('beforeend', hideButtonTemplate)
	const button = document.querySelector(`.${hideButtonClass}`)
	button.addEventListener('click', hideButtonHandler)
	
}




const showButtonClass = 'flatSearch_openMapButton'
const showButtonTemplate = `
	<button class="${showButtonClass}">
		<<
	</button>
`
const showButtonHandler = () => {
	createMap()

	drawMarkers()
	const button = document.querySelector(`.${showButtonClass}`)
	button.removeEventListener('click', showButtonHandler)
	button.remove()
	hideButton()

	setMapAutoShow(true)
}

const showButton = () => {
	document.body.insertAdjacentHTML('beforeend', showButtonTemplate)
	const button = document.querySelector(`.${showButtonClass}`)
	button.addEventListener('click', showButtonHandler)
}



const config = [
	{
		host: "www.nehnutelnosti.sk",
		listingPage: () => {
			const items = document.querySelectorAll('.advertisement-item')
			return items.length > 0
		},
		getMarkersData: async () => {
			const items = [...document.querySelectorAll('.advertisement-item')]
			const locations$ = items.map(async (item) => {
				const link = item.querySelector('.advertisement-item--content__title')
				const response = await fetch(link.href).catch(e => console.log('failed to fetch', e))
				const responseText = await response.text()
				const parser = new DOMParser()
				const page = parser.parseFromString(responseText, "text/html")

				const script = page.querySelector("#__NEXT_DATA__")
				if (script) {
					const data = JSON.parse(script.innerHTML)

					const location = data.props.pageProps.advertisement.location.point
					return { lat: location.latitude, lng: location.longitude, link: link.href, text: link.innerHTML }	
				}

				const oldMap = page.querySelector('[data-gps-marker]')
				const data = JSON.parse(oldMap.getAttribute('data-gps-marker'))
				return { lat: data.gpsLatitude, lng: data.gpsLongitude, link: link.href, text: link.innerHTML }	
			})

			return (await Promise.allSettled(locations$)).map(({ value }) => value)
		}
	}
]

const getConfig = () => {
	return config.find((config) => location.host === config.host && config.listingPage())	
}

const main = async () => {
	const config = getConfig()
	if (!config) return

	if (showAutoOpenMap()) {
		createMap()
		drawMarkers()
		hideButton()
	} else {
		showButton()
	}
}



window.onload = function () {
	main()
	console.log(L)
}

