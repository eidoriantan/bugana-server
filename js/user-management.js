
$(document).ready(function () {
  const token = sessionStorage.getItem('token')
  const payloadItem = sessionStorage.getItem('payload')
  if (token === null) {
    window.location.href = '/'
    return
  }

  const payload = JSON.parse(payloadItem)
  const tempUser = $('#temp-user').prop('content')
  const tempAction = $('#temp-user-actions').prop('content')
  const tempPageBtn = $('#temp-page-btn').prop('content')
  const search = new URLSearchParams(window.location.search)
  const type = search.get('type')
  const view = type || (payload.type === 'headadmin' ? 'admin' : 'farmers')
  $(`.user-${view}`).addClass('active')
  $(`.user-new-${view}`).removeClass('d-none')

  let page = 1
  let limit = parseInt($('#limit-page').val())
  let userName = $('#user-search').val()
  let users = []

  async function displayUsers () {
    $('#users').empty()

    const params = new URLSearchParams()
    params.set('token', token)
    params.set('view', view)
    params.set('page', page.toString())
    params.set('limit', limit.toString())
    if (userName) params.set('user', userName)

    const response = await $.ajax('/api/admin/users.php?' + params.toString(), {
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

    users = response.users
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const elem = $(tempUser).clone(true, true)
      const createdDate = dateFormat(user.created)
      const lastloginDate = dateFormat(user.lastlogin)
      $(elem).find('.user-code').text(user.code)
      $(elem).find('.user-name').text(user.name)
      $(elem).find('.user-email').text(user.email)
      $(elem).find('.user-created').text(createdDate)
      $(elem).find('.user-lastlogin').text(lastloginDate)

      if (user.type !== 'farmer') {
        $(document).find('.non-farmer-btns').removeClass('d-none')
      }

      if ((payload.type === 'headadmin' && user.type === 'customer') || (payload.type === 'admin' && user.type === 'farmer')) {
        const actionsElem = $(tempAction).clone(true, true)
        if (user.verified !== '0') $(actionsElem).find('.user-action-verify').addClass('d-none')
        else $(actionsElem).find('.user-action-verify').attr('data-index', i).click(verifyUser)
        $(elem).find('.user-actions').empty().append(actionsElem)
      }

      if (view === 'admin') {
        const actionsElem = $(tempAction).clone(true, true)
        $(actionsElem).find('.user-action-verify').addClass('d-none')
        $(actionsElem).find('.user-action-reset').removeClass('d-none').attr('data-index', i).click(resetUser)
        $(elem).find('.user-actions').empty().append(actionsElem)
      }

      $('#users').append(elem)
    }
  }

  async function verifyUser (event) {
    event.preventDefault()

    const index = $(this).attr('data-index')
    const user = users[index]
    $('#verify-id').val(user.id)
    $('#verify-validid').attr('src', '/api/admin/validid.php?id=' + user.id)
    modal('open', '#modal-verify')
  }

  async function resetUser (event) {
    event.preventDefault()

    const index = $(this).attr('data-index')
    $('#modal-confirm-reset').find('[data-user]').attr('data-user', index)
    modal('open', '#modal-confirm-reset')
  }

  $('[data-user]').click(async function (event) {
    event.preventDefault()

    const index = $(this).attr('data-user')
    const user = users[index]

    $('#modal-confirm-reset').find('button').attr('disabled', true)
    const response = await $.ajax('/api/admin/reset.php', {
      method: 'post',
      dataType: 'json',
      data: { token: token, id: user.id }
    })

    $('#modal-confirm-reset').find('button').attr('disabled', null)
    if (response.success) {
      modal('close')
      modal('open', '#modal-reset-successful')
    }
  })

  $('#form-verify').submit(async function (event) {
    event.preventDefault()

    const form = $(this).get(0)
    const action = $(form).attr('action')
    const method = $(form).attr('method')
    const token = sessionStorage.getItem('token')
    const formData = new FormData(form)
    formData.append('token', token)

    $(form).find('[type="submit"]').attr('disabled', true).text('Verifying...')
    $(form).find('[type="reset"]').attr('disabled', true)

    const response = await $.ajax(action, {
      method: method,
      dataType: 'json',
      data: formData,
      processData: false,
      contentType: false
    })

    $(form).find('[type="submit"]').attr('disabled', null).text('Verify')
    $(form).find('[type="reset"]').attr('disabled', null)
    if (response.success) {
      await displayUsers()
      modal('close')
    }
  })

  $('#form-verify').on('reset', async function (event) {
    event.preventDefault()

    const form = $(this).get(0)
    const method = $(form).attr('method')
    const token = sessionStorage.getItem('token')
    const formData = new FormData(form)
    formData.append('token', token)

    $(form).find('[type="submit"]').attr('disabled', true)
    $(form).find('[type="reset"]').attr('disabled', true).text('Declining...')

    const response = await $.ajax('/api/admin/users/decline.php', {
      method: method,
      dataType: 'json',
      data: formData,
      processData: false,
      contentType: false
    })

    $(form).find('[type="submit"]').attr('disabled', null)
    $(form).find('[type="reset"]').attr('disabled', null).text('Decline')
    if (response.success) {
      await displayUsers()
      modal('close')
    }
  })

  $('#form-register-admin').submit(async function (event) {
    event.preventDefault()

    const form = $(this).get(0)
    const action = $(form).attr('action')
    const method = $(form).attr('method')
    const formData = new FormData(form)
    formData.append('token', token)
    formData.append('type', 'admin')

    $('#form-register-admin-error').empty()
    $(form).find('[type="submit"]').attr('disabled', true).text('Registering...')

    const response = await $.ajax(action, {
      method: method,
      dataType: 'json',
      data: formData,
      processData: false,
      contentType: false
    })

    $(form).find('[type="submit"]').attr('disabled', null).text('Register account')
    if (response.success) {
      $(form).trigger('reset')
      await displayUsers()
      modal('close')
      modal('open', '#modal-added-successful')
    } else {
      $('#form-register-admin-error').text(response.message)
    }
  })

  $('#form-register').submit(async function (event) {
    event.preventDefault()

    const form = $(this).get(0)
    const action = $(form).attr('action')
    const method = $(form).attr('method')
    const formData = new FormData(form)
    formData.append('token', token)
    if (payload.type === 'admin') formData.append('type', 'farmer')

    $('#form-register-error').empty()
    $(form).find('[type="submit"]').attr('disabled', true).text('Registering...')

    const response = await $.ajax(action, {
      method: method,
      dataType: 'json',
      data: formData,
      processData: false,
      contentType: false
    })

    $(form).find('[type="submit"]').attr('disabled', null).text('Register account')
    if (response.success) {
      $(form).trigger('reset')
      await displayUsers()
      modal('close')
      modal('open', '#modal-customer-added-successful')
    } else {
      $('#form-register-error').text(response.message)
    }
  })

  let codeTimer = null
  let limitTimer = null

  $('#user-search').on('keyup', function () {
    const value = $(this).val()
    clearTimeout(codeTimer)
    codeTimer = setTimeout(function () {
      userName = value
      page = 1
      displayUsers()
    }, 1250)
  })

  $('#user-search').on('keydown', function () {
    if (codeTimer) clearTimeout(codeTimer)
  })

  $('#limit-page').on('keyup', function () {
    const value = $(this).val()
    clearTimeout(limitTimer)
    limitTimer = setTimeout(function () {
      limit = parseInt(value)
      page = 1
      displayUsers()
    }, 1250)
  })

  $('#limit-page').on('keydown', function () {
    if (limitTimer) clearTimeout(limitTimer)
  })

  $(document).on('click', '[data-page]', function (event) {
    const target = event.currentTarget
    const value = $(target).attr('data-page')
    page = parseInt(value)
    displayUsers()
  })

  displayUsers()
})
