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

const getPictures = async (numbers, subject) => {
  const mathURL = `https://gdz.ru/class-10/algebra/nikolskij-potapov/${numbers[0]}-item-${numbers[1]}/`
  const physicsURL = `https://gdz.ru/class-11/fizika/rymkevich/${numbers[0]}-nom/`
  let gdz = await fetch({ 'physics': physicsURL, 'math': mathURL }[subject])
  if(gdz.status !== 200) return undefined
  let gdzPage = await gdz.text()
  const root = parse(gdzPage)
  const solutions = root.querySelectorAll('.with-overtask > img')
  if(!solutions.length) {
    return undefined
  } else {
    const solutionPictures = Array.from(solutions).map(img => 'https:'+img.getAttribute('src'))
    return solutionPictures
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

      let regex = '[1-9]{1,2}\\.[0-9]{0,3}'
      let subject = 'math'
      if(['физ', 'физика', 'рым', 'рымкевич'].some(ind => text.indexOf(ind) === 0)) {
        regex = '[0-9]{1,4}'
        subject = 'physics'
      }

      let numbers = text.replace(/\n/g, ' ').split(' ').filter(String).join(' ')

      numbers = numbers.match(new RegExp(`${regex} ?\\(?([а-яА-Я],? ?)*\\)?`, 'g'))
      let homework = numbers.map(n => {
        let letters = n.match(/[а-яА-Я]/g)
        let number = n.match(new RegExp(regex))[0]
        return [number.split('.'), letters]
      })

      let messageText = ''
      const maxPictures = 10
      if(homework.length > maxPictures) messageText += 'вк не разрешает больше 10 картинок в одном сообщении'
      homework.length = Math.min(maxPictures, homework.length)
      group_id = req.body.group_id
      let notFound = []
      let results = await Promise.all(homework.map(async hw => {
        let result = await getPictures(hw[0], subject)
        if(result === undefined) notFound.push(hw[0].join('.'))
        else return result
      }))
      if(notFound.length) {
        if(messageText.length) messageText += '. '
        messageText += 'не найдены: '+notFound.join(', ')
      }

      results = results.filter(Boolean)
      let urls = []
      for (let solutionUrls of results) {
        urls = urls.concat(...solutionUrls)
      }

      const attachments = await Promise.all(urls.map(async url => await uploadImage(url)))
      const query = new URLSearchParams({
        peer_id: message.peer_id,
        random_id: randomID(),
        attachment: attachments.join(','),
        reply_to: message.id,
        ...(messageText && { message: messageText }),
        ...b
      })
      fetch(`https://api.vk.com/method/messages.send?${query}`)
    }
  }
})

app.listen(port, () => {
  console.log(`GDZ bot app listening at http://localhost:${port}`)
})
