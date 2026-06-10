import httpClient from '../../infrastructure/httpClient'

export async function uploadExcel(file) {
    const formData = new FormData()
    formData.append('archivo', file)
    const res = await httpClient.post('/api/upload', formData)
    return res.data
}
