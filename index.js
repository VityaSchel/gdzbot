import express from 'express'
const app = express()
const port = 40404
import fetch from 'node-fetch'
import nodeHtmlParser from 'node-html-parser'
const { parse } = nodeHtmlParser
import FormData from 'form-data'

app.use(express.json())

const access_token = '6cb73bca06b83bf91d535c1b66caf8c0a6be371219acb9592f52df0648564f360611fdc998ad06966652c'
let group_id
const b = {
  v: '5.131',
  access_token
}

const getPictures = async numbers => {
  const apiURL = `https://gdz.ru/class-10/algebra/nikolskij-potapov/${numbers[0]}-item-${numbers[1]}/`
  let gdz = await fetch(apiURL)
  let gdzPage = await gdz.text()
  const root = parse(gdzPage)
  const solution = 'https:'+root.querySelector('.with-overtask > img').getAttribute('src')
  return solution
}

const uploadImage = async url => {
  const query = new URLSearchParams({
    group_id,
    ...b
  })
  let uploadServerResponse = await fetch(`https://api.vk.com/method/photos.getMessagesUploadServer?${query}`)
  let uploadServer = await uploadServerResponse.json()
  console.log(uploadServer);
  let uploadServerURL = uploadServer.upload_url

  let solutionImage = await fetch(url)
  let solutionImageBuffer = await solutionImage.buffer()

  const body = new FormData()
  body.append('photo', solutionImageBuffer, { filename : `${Date.now()}.jpg` })
  let uploadedPhotoRaw = await fetch(uploadServerURL, {
    method: 'POST',
    body
  })
  let uploadedPhoto = await uploadedPhotoRaw.json()
  console.log(uploadedPhoto)

  const saveQuery = {
    photo: uploadedPhoto.photo,
    server: uploadedPhoto.server,
    hash: uploadedPhoto.hash,
    ...b
  }
  let savedAttachment = await fetch(`https://api.vk.com/method/photos.saveMessagesPhoto?${saveQuery}`)
  let attachment = await savedAttachment.json()
  console.log(attachment)
  return `photo${attachment.owner_id}_${attachment.id}`
}

const sendFirstMessage = async peerID => {
  const historyQuery = new URLSearchParams({
    peer_id: peerID,
    count: 1,
    ...b
  })
  let messages = await fetch(`https://api.vk.com/method/messages.getHistory?${historyQuery}`)
  let history = await messages.json()
  console.log(history.response.items)
  if(history.response.items.length === 0) {
    let query = new URLSearchParams({
      peer_id: peerID,
      message: 'Чтобы воспользоваться ГДЗ-ботом, оплатите подписку (149 руб/мес). Получить ссылку для оплаты: /vadim',
      ...b
    })
    await fetch(`https://api.vk.com/method/messages.send?${query}`)
    await new Promise(resolve => setTimeout(() => resolve(), 1000))
    query = new URLSearchParams({
      peer_id: peerID,
      message: 'шутка',
      ...b
    })
    await fetch(`https://api.vk.com/method/messages.send?${query}`)
  }
}

app.post('/', async (req, res) => {
  if(req.body.secret === 'satana_mogila_kladbische_govno_hyila'){
    const message = req.body.object.message
    let text = message.text

    if(text.indexOf('гдз ') === 0) {
      await sendFirstMessage(message.peer_id)

      text = text.substring(4).trim()
      let numbers = text.replace(/\n/g, ' ').split(' ').filter(String).join(' ')
      numbers = numbers.match(/[1-3]\.[1-9]{0,3} ?\(?([а-яА-Я],? ?)*\)?/g)
      let homework = numbers.map(n => {
        let letters = n.match(/[а-яА-Я]/g)
        let number = n.match(/[1-3]\.[1-9]{0,3}/)[0]
        return [number.split('.'), letters]
      })
      let tooMany = homework.length > 5
      homework.length = Math.min(5, homework.length)
      group_id = req.body.group_id
      let results = await Promise.all(homework.map(async hw => getPictures(hw[0])))
      const attachments = await Promise.all(results.map(async url => await uploadImage(url)))
      const query = new URLSearchParams({
        peer_id: message.peer_id,
        random_id: String(Date.now()).substring(7)+('000'+Math.floor(Math.random()*1000)).substr(-3),
        attachment: attachments.join(','),
        reply_to: message.id,
        ...(tooMany && { message: 'вк не разрешает больше 5 картинок в одном сообщении' }),
        ...b
      })
      fetch(`https://api.vk.com/method/messages.send?${query}`)
    }
  }
  res.send('ok')
})

app.listen(port, () => {
  console.log(`GDZ bot app listening at http://localhost:${port}`)
})
