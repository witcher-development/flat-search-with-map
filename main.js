const SHOW_MAP_LOCAL_STORE = "flatSearch_show-map"
const MAP_POSITION_LOCAL_STORE = "flatSearch_map-center"

const showAutoOpenMap = () => localStorage.getItem(SHOW_MAP_LOCAL_STORE) === "true"
const setMapAutoShow = (value) => localStorage.setItem(SHOW_MAP_LOCAL_STORE, value) 




function debounce(func, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

const mapPosition = () => {
	const store = localStorage.getItem(MAP_POSITION_LOCAL_STORE)
	if (store !== null) return JSON.parse(store)
	return { center: [48.144, 17.113], zoom: 15 }
}
const setMapPosition = (center, zoom) => {
	const position = { center: [center.lat, center.lng], zoom }
	localStorage.setItem(MAP_POSITION_LOCAL_STORE, JSON.stringify(position))  
}
const debouncedSetMapPosition = debounce((center, zoom) => {
    setMapPosition(center, zoom);
}, 300); 


let map = null

const createMap = () => {
	if (map !== null) {
		hideMap()
	}

	document.body.classList.add("flatSearch_bodyOffset")
	document.body.insertAdjacentHTML('beforeend', '<div id="flatSearch_mapElement"></div>')

	const { center, zoom } = mapPosition()
	map = L.map('flatSearch_mapElement').setView(center, zoom);

	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);

	map.on('move', () => {
		debouncedSetMapPosition(map.getCenter(), map.getZoom())
	})
	map.on('zoom', () => {
		debouncedSetMapPosition(map.getCenter(), map.getZoom())
	})
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

// const icon = L.icon({
// 	iconUrl: chrome.runtime.getURL("images/marker-icon.png")
// })
const icon = (link, price) => L.divIcon({
	className: "flatSearch_marker",
	html: `
		<div class="flatSearch_marker-inner">
			<a 
				href="${encodeURI(link)}" 
				target="_blank"
			>
				${price}
			</a>
		</div>
	`
})

const genMarker = (lat, lng, link, price) => {
  return L.marker([lat, lng], { icon: icon(link, price) })
}

const drawMarkers = async () => {
	const config = getConfig()

	showLoading()
	const data = await config.getMarkersData()
	hideLoading()

	data.filter(item => !!item).forEach(({ lat, lng, link, price }) => genMarker(lat, lng, link, price).addTo(map))
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

	hideSupportBanner()
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
	showSupportBanner()

	setMapAutoShow(true)
}

const showButton = () => {
	document.body.insertAdjacentHTML('beforeend', showButtonTemplate)
	const button = document.querySelector(`.${showButtonClass}`)
	button.addEventListener('click', showButtonHandler)
}


const supportTemplate = `
	<a class="flatSearch_support" href="https://www.buymeacoffee.com/witcherDev" target="_blank">
		<img src="https://cdn.buymeacoffee.com/buttons/default-orange.png" alt="Buy Me A Coffee" width="135">
	</a>
`
const showSupportBanner = () => {
	document.body.insertAdjacentHTML('beforeend', supportTemplate)
}
const hideSupportBanner = () => {
	document.querySelector('.flatSearch_support')?.remove()
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
				if (!link) return null

				const _price = item.querySelector('.advertisement-item--content__price').childNodes[0].textContent
				const price = parseInt(_price) || 0

				const response = await fetch(link.href).catch(e => console.log('failed to fetch', e))
				const responseText = await response.text()
				const parser = new DOMParser()
				const page = parser.parseFromString(responseText, "text/html")

				const script = page.querySelector("#__NEXT_DATA__")
				if (script) {
					const data = JSON.parse(script.innerHTML)

					const location = data.props.pageProps.advertisement.location.point
					return { lat: location.latitude, lng: location.longitude, link: link.href, price }	
				}

				const nextFOption = [...page.querySelectorAll("script")].find(el => el.innerText.startsWith('self.__next_f.push([1,"7:'))
				if (nextFOption) {
					const content = nextFOption.innerText
					const parsed = JSON.parse(content.substring(25, content.length - 5).replace(/\\/g,""))
					const point = parsed[3][3].advertisement.location.point
					return { lat: point.latitude, lng: point.longitude, link: link.href, price }
				}

				const oldMap = page.querySelector('[data-gps-marker]')
				if (!oldMap) return null

				const data = JSON.parse(oldMap.getAttribute('data-gps-marker'))
				return { lat: data.gpsLatitude, lng: data.gpsLongitude, link: link.href, price }	
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
		showSupportBanner()
	} else {
		showButton()
	}
}



window.onload = function () {
	main()
}

