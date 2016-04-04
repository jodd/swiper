/* ==========================================================================
    Slider
   ========================================================================== */

import $ from 'jquery'

const $W = $(window)
const D = document
const $D = $(document)
const $H = $(document.documentElement)
const $B = $(document.body)

const defaults = {
    text: {
        prev: 'Previous',
        next: 'Next'
    },
    resize: () => {}
}

const namespace = 'slider'

/**
 * Alter the .on() jquery function to namespace events automatically
 *
 * NOTE: Not sure if it's clean and/or safe,
 * didnt find any resource about this technique
 */
const jqueryOn = $.fn.on
$.fn.on = function(events, ...args) {
    return jqueryOn.apply(this, [events.split(' ').join('.' + namespace + ' ') + '.' + namespace].concat(args))
}

/**
 * Return the CSS transition duration of a property on an element or null
 */
function transitionDuration(elem, property) {
    const props = $(elem).css('transition-property').split(',')
    const durations = $(elem).css('transition-duration').split(',')
    const index = $.inArray(property, props)
    return index < 0 ? null : parseFloat(durations[index]) * 1000
}

/* -------------------------------------------------------------------------- */

/**
 * Module definition
 */
export default (elem, options = {}) => {

const opts = $.extend(true, {}, defaults, options)
const id = elem.id || ''

let index = 0 // 0-based index of the current slide
let width = 0 // width of the slides-wrapper (i.e. total width of all slides)
// height of the slides-wrapper (will equal to the height of the tallest slide)
let height = 0
let intervalId // used to track touch moves
let timeout // Used to debounce the `resize` event

let start = {} // Used to store the position of touchStart event
// Used to store the position of touch move event every `interval` (ms)
let snapshot = { x: 0, y: 0, interval: 120 }
let move = {} // Used to set the direction of the touch move (horiz. or vert.)
// Used to save the `left` value of the slider position
let position = { x: 0, y: 0 }


/**
 * Paging factory
 */
function Paging(selected = 0) {

    const $list = $('<ul>')
    const $wrapper = $('<div>', { 'class': 'slider-paging' })

    const update = () => {

        const itemWidth = $list.children(':first').outerWidth()

        // Update selected paging item
        $list.find('a').attr('aria-selected', false).eq(index).attr('aria-selected', true)

        // Slide the paging list to display selected item
        $wrapper.animate({
            scrollLeft: Math.max((index + 1) * itemWidth - $wrapper.width(), 0)
        }, 300 )
    }

    for (let i = 1; i <= $slides.length; i++) {

        let $item = $('<a>', {
            'href': '#article-' + i,
            'role': 'button',
            'aria-controls': id,
            'aria-selected': (i - 1) === selected,
            html: $('<span>', { text: $slides.eq(i - 1).find('h2').text() })
            // 'tabindex': -1
        })

        $list.append($('<li>', {
            'role': 'presentation',
            html: $item
        }))
    }

    $wrapper.append($list)

    return {
        elem: $list[0],
        wrapper: $wrapper[0],
        update: update
    }
}

/**
 * Set the sizes of the container, wrapper and slides
 */
function resize() {

    const $paging = $(paging.elem)

    width = 0
    height = 0

    $slider.css('width', '')
    $slides.css({ width: '', height: '' })
    $paging.css('width', '')
    $paging.children().css('width', '')

    opts.resize.call(elem)

    $slides.each((index, element) => {

        let $slide = $(element)

        // Store the height of the biggest slide
        // height = Math.max($slide.height(), height)

        // Store the total width of all the slides
        width += $slide.outerWidth()

        // Set slide width
        $slide.width($slide.width())

    })/*.css('height', height)*/

    // Set the slider container height matching the highest slide
    // $container.height(height)

    // Set the slider width as it contains all slides in a single row
    $slider.width(width)

    const pagingItemWidth = $paging.children(':first').outerWidth()
    const pagingWidth = pagingItemWidth * $paging.children().width(pagingItemWidth).length
    $paging.width(pagingWidth)

    // Adjust the slider position
    slide()
}

/**
 * touchStart
 */
function touchStart(e) {

    e.touches = e.touches || e.originalEvent.changedTouches

    // Cache initial position to compare later on touchmove handler
    start.x = snapshot.x = e.touches[0].clientX
    start.y = snapshot.y = e.touches[0].clientY

    move.horizontal = null

    position.x = parseInt($slider.css('left'))



    $W.on('touchmove', touchMove)
    $W.on('touchend', touchEnd)
}

/**
 * touchMove
 */
function touchMove(e) {

    e.touches = e.touches || e.originalEvent.changedTouches

    move.x = e.touches[0].clientX - start.x
    move.y = e.touches[0].clientY - start.y

    move.horizontal === null && (move.horizontal = Math.abs(move.x) > Math.abs(move.y))

    if (!move.horizontal) return // Handle swipe left/right only (not up/down)

    e.preventDefault()

    $slides.removeClass('invisible')

    !intervalId && (intervalId = setInterval(() => {
        snapshot.x = e.touches[0].clientX
    }, snapshot.interval))

    // Handle edges
    if (position.x + move.x > 0 || Math.abs(position.x + move.x) > width - $wrapper.width())
        move.x = move.x / 2

    $slider.addClass('no-transition')
        .css('left', position.x + move.x)
}

/**
 * touchEnd
 */
function touchEnd(e) {

    e.touches = e.touches || e.originalEvent.changedTouches

    const flick = snapshot.x - e.touches[0].clientX

    $W.off('touchmove.' + namespace)
    $W.off('touchend.' + namespace)

    intervalId = clearInterval(intervalId)

    if (!move.horizontal) return

    $slider.removeClass('no-transition')

    if (Math.abs(flick) > 24) {
        index += flick < 0 ? -1 : 1
    } else {
        index = - Math.round(move.x / $wrapper.width() - index)
    }

    index = Math.max(Math.min(index, $slides.length - 1), 0)

    slide()
}

/**
 * Display previous slide
 */
function prev() {
    if (index)
        slide(index--)
}

/**
 * Display next slide
 */
function next() {
    if (index !== $slides.length - 1)
        slide(index++)
}

/**
 * Slide to the current `index`
 */
function slide() {

    $slider.css('left', -index * $wrapper.width())

    /**
     * Since we prevent off-canvas focus with `visibility: hidden`,
     * we must dispay slides during animation
     * and set `invisible` back when animation ends
     */
    $slides
        .attr('aria-selected', false)
        .removeClass('invisible')

    $slides.eq(index).attr('aria-selected', true)

    setTimeout(() => {
        $slides.addClass('invisible').eq(index).removeClass('invisible').focus()
    }, opts.transitionDuration)

    paging.update()
}

/**
 * keydown
 */
function keydown(e) {
    switch (e.keyCode) {
        case 37: // LEFT ARROW
            prev()
            break
        case 39: // RIGHT ARROW
            next()
    }
}

/* -------------------------------------------------------------------------- */
/**
 * Initialize the slider
 * Create the html structure (wrappers and containers)
 * and insert the controls (prev/next buttons + paging list)
 */
const $slider = $(elem).addClass('slider')

// Get the transition duration of the CSS property used to animate the slider
opts.transitionDuration = transitionDuration(elem, 'left') || 0

const $container = $slider.wrap('<div class="slider-container">').parent()

const $wrapper = $('<div>', {
    'class': 'slider-wrapper',
    html: $slider
}).appendTo($container)

// Make the slides "tab-ables"
const $slides = $slider.children().wrap('<div>').parent().attr('tabindex', 0)

// Create a list of links pointing to each slides
const paging = Paging()

// Display proper element when click on paging list (without animation)
$(paging.elem).on('click', 'a', e => {
    e.preventDefault()

    index = $(e.target).closest('li').prevAll().length

    $slider.addClass('no-transition')

    slide()

    $slider.removeClass('no-transition')
})

// Create the previous/next buttons
const $prev = $('<button>', {
    'class': 'prev',
    'aria-controls': id,
    'role': 'presentation',
    html: '<span>' + opts.text.prev + '</span>'
}).on('click', prev)

const $next = $('<button>', {
    'class': 'next',
    'aria-controls': id,
    'role': 'presentation',
    html: '<span>' + opts.text.next + '</span>'
}).on('click', next)

// Prev/next buttons wrapper
const $controls = $('<div class="slider-controls">')
    .append($prev, $next)

// Create a wrapper for all controls (prev/next buttons + paging list)
const $controlsWrapper = $('<div class="slider-controls-wrapper">')
    .append(paging.wrapper)
    .append($controls)
    .prependTo($container)

// Set the sizes when all images are loaded
// TODO: remove this stuff and lazyload the slide content
//       but be aware of the problems when calculating sizes before images are loaded
const $images = $slider.find('img')
let counter = 0
const imageLoaded = () => (++counter === $images.length) && resize()
$images.each((index, element) => {

    // Check if image is already loaded (from cache)
    if (element.complete) {
        imageLoaded()
    } else {
        $(element).load(imageLoaded)
    }
})

// If no image, immediately set sizes
!$images.length && resize()

// Support swipe gesture on touch devices
$W.on('touchstart', e => {
    $(e.target).closest(elem).length && touchStart(e)
})

// Debounce handler when the window is resized
$W.on('resize', e => {
    timeout && clearTimeout(timeout)
    timeout = setTimeout(resize, 300)
})

// Provide basic keyboard control
$slider.on('keydown', keydown)

// Export some functions
return {
    prev: prev,
    next: next
}

}