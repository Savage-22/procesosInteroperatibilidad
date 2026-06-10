import { uploadExcel } from '../api/excelApi'

export async function subirExcel(file) {
    const res = await uploadExcel(file)
    return res.data
}

export function getUploadErrorMessage(error) {
    if (error.response?.data?.detail) return error.response.data.detail
    return 'No se pudo subir el archivo.'
}
