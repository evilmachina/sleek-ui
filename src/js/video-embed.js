'use strict';

export default class VideoEmbed {
	constructor (el, data, config) {
		this.el = el;
		this.data = data;
		this.config = Object.assign({
			api: true
		}, config);
		this.ytPlayStates = {
			'??': 'unknown',
			'-1': 'unstarted',
			'0': 'ended',
			'1': 'playing',
			'2': 'paused',
			'3': 'buffering',
			'5': 'video-cued'
		};
	}

	mount () {
		this.buildHTML();

		if (this.config.api) {
			if (this.el.dataset.src) {
				this.el.setAttribute('src', this.el.dataset.src);
			}

			if (this.data.provider_name === 'YouTube') {
				const old = window.onYouTubeIframeAPIReady;

				window.onYouTubeIframeAPIReady = () => {
					if (old) {
						old();
					}

					this.initYouTube();
				};

				this.addScript('https://www.youtube.com/iframe_api');
			}
			else if (this.data.provider_name === 'Vimeo') {
				this.addScript('https://player.vimeo.com/api/player.js').then(() => this.initVimeo());
			}
		}
		else {
			this.toggleSrc();
		}
	}

	buildHTML () {
		// Wrapper
		this.wrapEl = document.createElement('figure');
		this.wrapEl.classList.add('video-embed', 'video-embed--' + this.data.provider_name);

		// Video/Image wrapper
		const embedEl = document.createElement('div');
		embedEl.classList.add('embed');

		// Image wrapper
		this.thumbnailEl = document.createElement('div');
		this.thumbnailEl.classList.add('thumbnail');

		if (this.data.thumbnail_url) {
			this.thumbnailEl.appendChild(this.buildThumbnailHTML());
		}

		// Title
		if (this.data.title) {
			const titleEl = document.createElement('figcaption');
			titleEl.innerHTML = this.data.title;
		}

		// The iframe is already wrapped in a div.video
		if (this.el.parentNode.matches('div.video')) {
			this.el.parentNode.parentNode.insertBefore(this.wrapEl, this.el.parentNode);
			embedEl.appendChild(this.el.parentNode);
		}
		// Create the div.video
		else {
			const videoEl = document.createElement('div');
			videoEl.classList.add('video');

			this.el.parentNode.insertBefore(this.wrapEl, this.el);

			videoEl.appendChild(this.el);
			embedEl.appendChild(videoEl);
		}

		embedEl.appendChild(this.thumbnailEl);
		this.wrapEl.appendChild(embedEl);

		if (this.data.title) {
			this.wrapEl.appendChild(titleEl);
		}
	}

	// TODO: Should take provider_name, youttubeId, thumbnail_url as arguments and not rely on dataset.youtubeId
	buildThumbnailHTML () {
		// ♥️ Simon
		if (this.data.provider_name === 'YouTube' && this.el.dataset.youtubeId) {
			const picture = document.createElement('picture');

			const webp = document.createElement('source');
			webp.srcset = 'https://i.ytimg.com/vi_webp/' + this.el.dataset.youtubeId + '/maxresdefault.webp 1080w, https://i.ytimg.com/vi_webp/' + this.el.dataset.youtubeId + '/sddefault.webp 640w, https://i.ytimg.com/vi_webp/' + this.el.dataset.youtubeId + '/hqdefault.webp 480w, https://i.ytimg.com/vi_webp/' + this.el.dataset.youtubeId + '/mqdefault.webp 320w';
			webp.type = 'image/webp';

			picture.appendChild(webp);

			const img = document.createElement('source');
			img.srcset = 'https://i.ytimg.com/vi/' + this.el.dataset.youtubeId + '/maxresdefault.jpg 1080w, https://i.ytimg.com/vi/' + this.el.dataset.youtubeId + '/sddefault.jpg 640w, https://i.ytimg.com/vi/' + this.el.dataset.youtubeId + '/hqdefault.jpg 480w, https://i.ytimg.com/vi/' + this.el.dataset.youtubeId + '/mqdefault.jpg 320w';
			img.type = 'image/jpeg';

			picture.appendChild(img);

			const fallback = document.createElement('img');
			fallback.src = 'https://i.ytimg.com/vi/' + this.el.dataset.youtubeId + '/hqdefault.jpg';

			picture.appendChild(fallback);

			return picture;
		}

		// Create a standard img
		const img = document.createElement('img');

		img.setAttribute('loading', 'lazy');
		img.src = this.data.thumbnail_url || 'https://placehold.it/800x600?text=N/A';

		return img;
	}

	initYouTube () {
		this.ytPlayer = new YT.Player(this.el, {
			events: {
				onReady: e => {
					this.wrapEl.classList.add('video-embed--state-' + (this.ytPlayStates[e.data] || 'unknown'));
				},
				onStateChange: e => {
					for (var [key, value] of Object.entries(this.ytPlayStates)) {
						this.wrapEl.classList.remove('video-embed--state-' + value);
					}

					this.wrapEl.classList.add('video-embed--state-' + (this.ytPlayStates[e.data] || 'unknown'));
				}
			}
		});

		this.thumbnailEl.addEventListener('click', e => {
			this.ytPlayer.playVideo();
		});
	}

	initVimeo () {
		this.vimeoPlayer = new Vimeo.Player(this.el);

		this.vimeoPlayer.on('play', () => {
			this.wrapEl.classList.add('video-embed--state-playing');
		});

		this.vimeoPlayer.on('ended', () => {
			this.wrapEl.classList.remove('video-embed--state-playing');
		});

		this.vimeoPlayer.on('pause', () => {
			this.wrapEl.classList.remove('video-embed--state-playing');
		});

		this.thumbnailEl.addEventListener('click', e => {
			this.vimeoPlayer.play();
		});
	}

	addScript (src) {
		return new Promise((resolve, reject) => {
			const existingScript = document.querySelector('script[src="' + src + '"]');

			if (!existingScript) {
				const script = document.createElement('script');

				script.src = src;

				document.body.appendChild(script);
				script.addEventListener('load', () => resolve(script));
			}
			else {
				resolve(existingScript);
			}
		});
	}

	toggleSrc () {
		const src = this.el.dataset.src || this.el.getAttribute('src');

		this.el.removeAttribute('src');

		this.thumbnailEl.addEventListener('click', e => {
			this.el.setAttribute('src', src + '&autoplay=true');
			this.wrapEl.classList.add('video-embed--state-playing');
		});
	}
}
