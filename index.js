import express from 'express'
const app = express()
const port = 40404
import fetch from 'node-fetch'
import nodeHtmlParser from 'node-html-parser'
const { parse } = nodeHtmlParser
import FormData from 'form-data'

app.use(express.json())

const randomID = () => String(Date.now()).substring(7)+('000'+Math.floor(Math.random()*1000)).substr(-3)

const access_token = '13fc8857c36b94d03b2d947a1c64fa774802f4b6436fd4ecc096a4c58a015cc904e073ed5a141dddce5df'
let group_id
const b = {
  v: '5.131',
  access_token
}

const getPictures = async (numbers, notFound) => {
  const apiURL = `https://gdz.ru/class-10/algebra/nikolskij-potapov/${numbers[0]}-item-${numbers[1]}/`
  let gdz = await fetch(apiURL)
  let gdzPage = await gdz.text()
  const root = parse(gdzPage)
  const solution = root.querySelector('.with-overtask > img')
  if(solution === null) {
    notFound.push(numbers.join('.'))
  } else {
    const solutionPicture = 'https:'+solution.getAttribute('src')
    return solutionPicture
  }
}

const uploadImage = async url => {
  const query = new URLSearchParams({
    group_id,
    ...b
  })
  let uploadServerResponse = await fetch(`https://api.vk.com/method/photos.getMessagesUploadServer?${query}`)
  let uploadServer = await uploadServerResponse.json()
  let uploadServerURL = uploadServer.response.upload_url

  let solutionImage = await fetch(url)
  let solutionImageBuffer = await solutionImage.buffer()

  const body = new FormData()
  body.append('photo', solutionImageBuffer, { filename : `${Date.now()}.jpg` })
  const uploadQuery = new URLSearchParams(b)
  let uploadedPhotoRaw = await fetch(`${uploadServerURL}?${uploadQuery}`, {
    method: 'POST',
    body
  })
  let uploadedPhoto = await uploadedPhotoRaw.json()

  const saveQuery = new URLSearchParams({
    photo: uploadedPhoto.photo,
    server: uploadedPhoto.server,
    hash: uploadedPhoto.hash,
    ...b
  })
  let savedAttachment = await fetch(`https://api.vk.com/method/photos.saveMessagesPhoto?${saveQuery}`)
  let attachment = await savedAttachment.json()
  return `photo${attachment.response[0].owner_id}_${attachment.response[0].id}`
}

const sendFirstMessage = async peerID => {
  const historyQuery = new URLSearchParams({
    peer_id: peerID,
    count: 2,
    ...b
  })
  let messages = await fetch(`https://api.vk.com/method/messages.getHistory?${historyQuery}`)
  let history = await messages.json()
  if(history.response.items.length < 2) {
    let query = new URLSearchParams({
      peer_id: peerID,
      message: 'Чтобы воспользоваться ГДЗ-ботом, оплатите подписку (149 руб/мес). Получить ссылку для оплаты: /vadim',
      random_id: randomID(),
      ...b
    })
    await fetch(`https://api.vk.com/method/messages.send?${query}`)
    await new Promise(resolve => setTimeout(() => resolve(), 1000))
    query = new URLSearchParams({
      peer_id: peerID,
      message: 'шутка',
      random_id: randomID(),
      ...b
    })
    await fetch(`https://api.vk.com/method/messages.send?${query}`)
  }
}

app.post('/', async (req, res) => {
  res.send('ok')
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
      let messageText = ''
      if(homework.length > 5) messageText += 'вк не разрешает больше 5 картинок в одном сообщении'
      homework.length = Math.min(5, homework.length)
      group_id = req.body.group_id
      let notFound = []
      let results = await Promise.all(homework.map(async hw => getPictures(hw[0], notFound)))
      if(notFound.length) messageText += '. не найдены: '+notFound.join(', ')
      const attachments = await Promise.all(results.filter(Boolean).map(async url => await uploadImage(url)))
      const query = new URLSearchParams({
        peer_id: message.peer_id,
        random_id: randomID(),
        attachment: attachments.join(','),
        reply_to: message.id,
        ...(messageText && { messageText }),
        ...b
      })
      fetch(`https://api.vk.com/method/messages.send?${query}`)
    }
  }
})

app.listen(port, () => {
  console.log(`GDZ bot app listening at http://localhost:${port}`)
})
