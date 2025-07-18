import { onCleanup, onMount, createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { selectFiles, ensureDir, saveGameFile } from './fs';
import { reqToken, getList } from './msgraph';
import { SelectedGame, createSignalValue } from './common';
import FileBrowser from './FileBrowser';
import { gpEventType } from './gamepad';

export const UploadFileButton: Component<{ selGame: SelectedGame, refetch: Function, class?: string }> = (props) => {
  return <>
    <input id="uploadfile" type="file" class="hidden" onChange={(evt) => selectFiles(props.selGame.platform, evt, props.refetch)} multiple />
    <button type="button" class={"btn btn-outline btn-primary " + props.class || ''} onClick={() => document.getElementById('uploadfile').click()}>Upload</button>
  </>
}

const Uploader: Component<{ selGame: SelectedGame, refetch: Function, showOneDrive: () => void }> = (props) => {
  return (
    <div class="flex flex-col items-center h-full pt-[20%]">
      <UploadFileButton selGame={props.selGame} refetch={props.refetch} class="btn-lg w-36 mb-5" />
      <button type="button" class="btn btn-outline btn-lg w-36" onClick={props.showOneDrive}>OneDrive</button>
    </div>
  )
}
export default Uploader

async function readDir(path: string): Promise<any[]> {
  return reqToken().then(() => getList(path === '' ? '/' : path).then(res => {
    return res.children
  }))
}

export function OneDriveUploader(props: { show: boolean, onHide: () => void, platform: string, refetch: Function }) {
  const cols = ['Select', 'File Name', 'Size']
  const [uploading, setUploading] = createSignal(false)

  function gpListener(e: CustomEvent<gpEventType>) {
    const { pressed } = e.detail
    if (pressed.includes('B')) {
      props.onHide()
    }
  }
  onMount(() => {
    document.addEventListener('modalGpEvent', gpListener)
  })

  onCleanup(() => {
    document.removeEventListener('modalGpEvent', gpListener)
  })

  const selFiles = createSignalValue([])
  return <>
    <input checked={props.show} type="checkbox" class="modal-toggle" />
    <div class="modal cursor-pointer">
      <div class="modal-box relative w-10/12 max-w-5xl h-[50%]">
        <label class="btn btn-sm btn-circle absolute right-2 top-2" onclick={props.onHide}>✕</label>
        <h3 class="font-bold text-lg">Upload from OneDrive</h3>
        <div class="h-[80%]">
          <FileBrowser {...{ readDir, cols, selFiles }} />
        </div>
        <div class="modal-action">
          <button type="button" class="btn btn-primary" classList={{ loading: uploading() }} disabled={uploading()} onClick={async () => {
            setUploading(true)
            const dir = `/${props.platform}`
            await ensureDir(dir)
            for (let i = 0; i < selFiles.value.length; i++) {
              // const file = allFiles[ids[i]]
              const file = selFiles.value[i]
              const url = file['@microsoft.graph.downloadUrl']
              const name = file.name
              console.log('down url; ', url)
              const data = await fetch(url)
                .then(res => res.arrayBuffer())
              await saveGameFile(`${dir}/${name}`, data)
            }
            props.refetch()
            props.onHide()
            setUploading(false)
          }
          }>{
              uploading() ? 'Uploading' : 'Upload'
            }
          </button>
        </div>
      </div>
    </div>
  </>
}
