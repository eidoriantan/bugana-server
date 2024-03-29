
$(document).ready(function () {
  const token = sessionStorage.getItem('token')
  if (token === null) {
    window.location.href = '/'
    return
  }

  const tempItem = $('#temp-item').prop('content')
  const tempStock = $('#temp-stock').prop('content')
  const tempNotification = $('#temp-perish').prop('content')
  const tempPageBtn = $('#temp-page-btn').prop('content')
  let farmerSort = ''
  let productSort = ''
  let stockInSort = ''
  let category = 'all'
  let page = 1
  let limit = parseInt($('#limit-page').val())
  let searchQ = $('#search-q').val()
  let products = []
  let currentProduct = null

  async function getNotifications () {
    const params = new URLSearchParams()
    params.set('token', token)

    const response = await $.ajax(`/api/admin/notifications.php`, {
      method: 'post',
      dataType: 'json',
      data: params,
      processData: false,
      contentType: false
    })

    if (!response.success) return
    for (let i = 0; i < response.notifications.length; i++) {
      const notification = response.notifications[i]
      const elem = $(tempNotification).clone(true, true)

      $(elem).find('.perish-details').text(notification.message)
      $('#perish-products').append(elem)
    }
  }

  async function displayStocks () {
    $('#inventory').empty()

    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', limit.toString())
    params.set('category', category)
    params.set('stock', '1')
    if (searchQ) params.set('search', searchQ)
    if (farmerSort) params.set('farmer.sort', farmerSort)
    if (productSort) params.set('product.sort', productSort)
    if (stockInSort) params.set('stockin.sort', stockInSort)

    const response = await $.ajax(`/api/product/list.php?${params.toString()}`, {
      method: 'get',
      dataType: 'json'
    })
    if (!response.success) return

    $('#pages').empty()
    if (response.prev) $('[data-prev]').removeClass('d-none').attr('data-page', page - 1)
    else $('[data-prev]').addClass('d-none')

    if (response.next) $('[data-next]').removeClass('d-none').attr('data-page', page + 1)
    else $('[data-next]').addClass('d-none')

    let i = page > 2 ? page - 2 : 1
    if (i > 2) $('#pages').append('<span class="mr-2">...</span>')
    $('[data-page="1"]').toggleClass('active', page === i && page === 1)

    for (i; i < page + 3; i++) {
      if (i <= 1 || i > response.pages) continue

      const elem = $(tempPageBtn).clone(true, true)
      $(elem).find('[data-page]').attr('data-page', i).text(i)
      if (page === i) $(elem).find('[data-page]').addClass('active')
      $('#pages').append(elem)
    }

    if (i <= response.pages) {
      const elem = $(tempPageBtn).clone(true, true)
      $(elem).find('[data-page]').attr('data-page', response.pages).text(response.pages)
      if (i !== response.pages) $('#pages').append('<span class="mr-2">...</span>')
      $('#pages').append(elem)
    }

    products = response.products
    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const elem = $(tempItem).clone(true, true)
      let stocks = 0
      let totalStocks = 0
      let category = ''
      switch (product.category) {
        case 'vegetable':
          category = 'Vegetable'
          break

        case 'root-crops':
          category = 'Root Crops'
          break

        case 'fruits':
          category = 'Fruits'
          break
      }

      product.stocksIn.forEach(stockIn => {
        const quantity = parseFloat(stockIn.quantity)
        totalStocks += quantity
      })

      stocks = totalStocks
      product.stocksOut.forEach(stockOut => {
        const quantity = parseFloat(stockOut.quantity)
        stocks += quantity;
      })

      const dateStr = product.stocksIn.length > 0 ? dateFormat(product.stocksIn[0].date) : ''
      $(elem).find('.item-farmer-name').text(product.farmername)
      $(elem).find('.item-category').text(category)
      $(elem).find('.item-product-name').text(product.name)
      $(elem).find('.item-stock-in-date').text(dateStr)
      $(elem).find('.item-stocks').text(`${stocks} kg`)
      $(elem).find('.item-total-stocks').text(`${totalStocks} kg`)
      $(elem).find('.item-show-stocks').attr('data-index', i).click(showStocksIn)
      $('#inventory').append(elem)
    }
  }

  async function showStocksIn (event) {
    event.preventDefault()

    const index = $(this).attr('data-index')
    const product = products[index]
    currentProduct = product

    $('#table-stock-in').empty()

    const params = new URLSearchParams()
    params.set('token', token)
    params.set('user', product.userfullname)
    const farmers = await $.getJSON(`/api/admin/users.php?${params.toString()}`)
    const farmer = farmers.users[0]
    $('#stock-farmer').text(farmer.name)
    $('#stock-product-name').text(currentProduct.name)
    $('#stock-product-price').text(commaNumber(currentProduct.price))

    for (let i = 0; i < product.stocksIn.length && i < 10; i++) {
      const stocks = product.stocksIn[i]
      const elem = $(tempStock).clone(true, true)
      const dateStr = dateFormat(stocks.date)
      $(elem).find('.stock-date').text(dateStr)
      $(elem).find('.stock-quantity').text(stocks.quantity)
      $(elem).find('.stock-revenue').text(stocks.revenue)
      $(elem).find('.stock-perish-left').text(stocks.perishDays > 0 ? stocks.perishDays + ' days' : 'Perished')
      $('#table-stock-in').append(elem)
    }

    modal('open', '#modal-stock-in')
  }

  let searchTimer = null
  let limitTimer = null

  $('#search-q').on('keyup', function () {
    const value = $(this).val()
    clearTimeout(searchTimer)
    searchTimer = setTimeout(function () {
      searchQ = value
      page = 1
      displayStocks()
    }, 1250)
  })

  $('#search-q').on('keydown', function () {
    if (searchTimer) clearTimeout(searchTimer)
  })

  $('#limit-page').on('keyup', function () {
    const value = $(this).val()
    clearTimeout(limitTimer)
    limitTimer = setTimeout(function () {
      limit = parseInt(value)
      page = 1
      displayStocks()
    }, 1250)
  })

  $('#limit-page').on('keydown', function () {
    if (limitTimer) clearTimeout(limitTimer)
  })

  $('#products-category-select').on('change', function () {
    const value = $(this).val()
    page = 1
    category = value
    displayStocks()
  })

  $('#form-stock-add').submit(async function (event) {
    event.preventDefault()
    if (currentProduct === null) return

    const form = $(this).get(0)
    const action = $(form).attr('action')
    const method = $(form).attr('method')
    const formData = new FormData(form)
    formData.append('token', token)
    formData.append('id', currentProduct.id)

    $('#form-stock-add-error').empty()
    $(form).find('[type="submit"]').attr('disabled', true).text('Adding Stocks...')

    const response = await $.ajax(action, {
      method: method,
      dataType: 'json',
      data: formData,
      processData: false,
      contentType: false
    })

    $(form).find('[type="submit"]').attr('disabled', null).text('CONFIRM')
    if (response.success) {
      $(form).trigger('reset')
      await displayStocks()
      modal('close')
      modal('open', '#modal-added-successful')
    } else {
      $('#form-stock-add-error').text(response.message)
    }
  })

  $('#sort-farmer-ascending').click(function () {
    farmerSort = 'asc'
    $('.dropdown-content.active').removeClass('active')
    displayStocks()
  })

  $('#sort-farmer-descending').click(function () {
    farmerSort = 'desc'
    $('.dropdown-content.active').removeClass('active')
    displayStocks()
  })

  $('#sort-product-ascending').click(function () {
    productSort = 'asc'
    $('.dropdown-content.active').removeClass('active')
    displayStocks()
  })

  $('#sort-product-descending').click(function () {
    productSort = 'desc'
    $('.dropdown-content.active').removeClass('active')
    displayStocks()
  })

  $('#sort-stockin-ascending').click(function () {
    stockInSort = 'asc'
    $('.dropdown-content.active').removeClass('active')
    displayStocks()
  })

  $('#sort-stockin-descending').click(function () {
    stockInSort = 'desc'
    $('.dropdown-content.active').removeClass('active')
    displayStocks()
  })

  $(document).on('click', '[data-page]', function (event) {
    const target = event.currentTarget
    const value = $(target).attr('data-page')
    page = parseInt(value)
    displayStocks()
  })

  getNotifications()
  displayStocks()
})
