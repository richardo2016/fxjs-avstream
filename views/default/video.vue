<template lang="pug">
	.video-container
		h3 {{ title }}

		template(v-if="type === 'video'")
			video(
				class="test-video"
				ref="video"
				poster="/shisong/poster.jpeg"
				controls
				name="media"
				preload="auto"
			)
				source(src="/conan/video.mp4" type="video/mp4")
		template(v-if="type === 'music'")
			video(
				class="test-music"
				ref="music"
				poster="/shisong/poster.jpeg"
				controls
				name="media"
				preload="auto"
				autoplay
			)
				source(src="/shisong/music.mp3" type="audio/mp3")
</template>

<script>
export default {
	data () {
		return {
			// music, video
			type: 'music'
		}
	},

	computed: {
		title () {
			switch (this.type) {
				case 'video':
					return '日本爱国主义教育片: 死神小学神打飞机'
				case 'music':
					return '十送红军'
			}
		}
	},

	methods: {
	},

	mounted () {
	}
}
</script>

<style lang="stylus" scoped>

.video-container
	max-width 80vw
	max-height 80vh
	margin 0 auto

	> .test-video
		width 100%

	> .test-music
		max-width 100%
		height 100%
		margin 0 auto
		display block

</style>
