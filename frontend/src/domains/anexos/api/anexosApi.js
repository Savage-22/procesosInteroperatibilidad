import httpClient from '../../../infrastructure/httpClient'

export async function getIndice() {
    return (await httpClient.get('/api/anexos')).data
}

export async function getAnexo1() {
    return (await httpClient.get('/api/anexos/1')).data
}

export async function getAnexo2(codigo) {
    return (await httpClient.get(`/api/anexos/2/${codigo}`)).data
}

export async function getAnexo4(codigo) {
    return (await httpClient.get(`/api/anexos/4/${codigo}`)).data
}
