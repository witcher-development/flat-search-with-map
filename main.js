const createMap = () => {
	document.body.classList.add("flatSearch_bodyOffset")
	document.body.insertAdjacentHTML('beforeend', '<div id="flatSearch_mapElement"></div>')
	const map = L.map('flatSearch_mapElement').setView([48.144, 17.113], 15);

	L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
		maxZoom: 19,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);

	return map
}
const hideMap = () => {
	const map = document.querySelector('#flatSearch_mapElement')
	map.remove()
	document.body.classList.remove("flatSearch_bodyOffset")
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
	const button = document.querySelector(`.${showButtonClass}`)
	button.removeEventListener('click', showButtonHandler)
	button.remove()
	hideButton()
}

const showButton = () => {
	document.body.insertAdjacentHTML('beforeend', showButtonTemplate)
	const button = document.querySelector(`.${showButtonClass}`)
	button.addEventListener('click', showButtonHandler)
	
}



const config = [
	{
		host: "www.nehnutelnosti.sk"
	}
]

const supportedSite = () => {
	return config.some(({ host }) => location.host === host)	
}


const main = () => {
	if (!supportedSite()) return

	showButton()
}



window.onload = function () {
	main()
	console.log(L)
}

