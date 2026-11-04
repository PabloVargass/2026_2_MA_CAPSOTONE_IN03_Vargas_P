import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';
import { API_URL } from '@/constants/api';

export type PickedImage = { uri: string; type: string; name: string; file?: File | null };
type Translate = (text: string, values?: Record<string, string>) => string;

// Abre cámara o galería y valida tipo y tamaño antes de subir; el servidor vuelve a validar.
export async function pickImage(camera: boolean, maxBytes: number, t: Translate, options: Partial<ImagePicker.ImagePickerOptions> = {}): Promise<PickedImage | null> {
  if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
    Alert.alert(t('Permiso requerido'), t('Permite el acceso a la cámara o selecciona una foto desde tu galería.'));
    return null;
  }
  const config: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: false, exif: false, ...options };
  const result = camera ? await ImagePicker.launchCameraAsync(config) : await ImagePicker.launchImageLibraryAsync(config);
  if (result.canceled) return null;
  const asset = result.assets[0];
  const type = asset.mimeType || (asset.uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
  if (!['image/jpeg', 'image/png'].includes(type) || (asset.fileSize ?? 0) > maxBytes) {
    Alert.alert(t('Foto inválida'), t('Selecciona una foto JPG o PNG de hasta {size} MB.', { size: String(maxBytes / 1048576) }));
    return null;
  }
  return { uri: asset.uri, type, name: `foto.${type === 'image/png' ? 'png' : 'jpg'}`, file: asset.file };
}

export async function uploadImage<T>(path: string, method: 'POST' | 'PUT', image: PickedImage): Promise<T> {
  const token = await SecureStore.getItemAsync('accessToken');
  if (!token) throw new Error('Debes iniciar sesión nuevamente.');
  const body = new FormData();
  body.append('foto', Platform.OS === 'web' && image.file ? image.file : ({ uri: image.uri, name: image.name, type: image.type } as unknown as Blob));
  const response = await fetch(`${API_URL}${path}`, { method, headers: { Authorization: `Bearer ${token}` }, body });
  const data = await response.json();
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join('\n') : data.message || 'Ocurrió un error.');
  return data as T;
}
