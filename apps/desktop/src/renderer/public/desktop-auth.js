const params = new URLSearchParams(location.hash.slice(1))
const access = params.get('access_token')
const refresh = params.get('refresh_token')
if (access && refresh && access.length < 8192 && refresh.length < 4096) {
  location.replace(`icchat://auth/callback?access_token=${encodeURIComponent(access)}&refresh_token=${encodeURIComponent(refresh)}`)
} else {
  document.querySelector('p').textContent = 'Não foi possível concluir o acesso. Volte ao IC Chat e tente novamente.'
}
