
const urlModel = require('../Model/Urlmodel')
const shortId = require('short-id')
const redis = require("redis");
const { promisify } = require("util");


//Connect to redis
const redisClient = redis.createClient(
    14740,
    "redis-14740.c301.ap-south-1-1.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("CUiEXoXZeeQiW5uj29jrMIOsgHQEDQHI", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});

//1. connect to the server
//2. use the commands :

//Connection setup for redis
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient)


//-----------------------------------------------------------Basic Validation---------------------------------------------------------------------------------//

function validateUrl(value) {
    return /^(https:\/\/www\.|http:\/\/www\.|www\.)[a-zA-Z0-9\-_.$]+\.[a-zA-Z]{2,5}(:[0-9]{1,5})?(\/[^\s]*)?/gm.test(value);
}

function isValidBody(value) {
    if (Object.keys(value).length == 0) { return false }
    else return true;
}


// 1 Api
//----------------------------------------------------------Post/url/shorten----------------------------------------------------------------------------//

const createUrl = async function (req, res) {

    try {
        let data;

        //Getting original Url from user
        let longUrl = req.body.longUrl;

        //validation check for empty body-
        if (!isValidBody(req.body)) return res.status(400).send({ status: false, message: 'Bad Request: Empty body' })


        //Getting data from cache
        let isCachedUrlData = await GET_ASYNC(`${longUrl}`)
        if (isCachedUrlData) {
            let cachedUrlData = JSON.parse(isCachedUrlData)

            data = {
                longUrl: cachedUrlData.longUrl,
                shortUrl: cachedUrlData.shortUrl,
                urlCode: cachedUrlData.urlCode
            }
            return res.status(201).send({ status: true, message: "success", data: data })
        }


        else {
            //Validating url
            if (!validateUrl(longUrl)) return res.status(400).send({ status: false, message: `${longUrl} is not a valid url` })

            //Generating unique url code
            const urlCode = shortId.generate().toLowerCase();

            //Checking uniqueness of url in database
            let isUniqueUrlCode = await urlModel.findOne({ urlCode: urlCode })
            if (isUniqueUrlCode) return res.status(400).send({ status: false, message: `${urlCode} is already exist` })

            //Generating short url using base url plus urlCode
            let shortUrl = "localhost:3000/" + urlCode;

            //Saving data in database
            let saveData = { longUrl, shortUrl, urlCode }

            let saveUrl = await urlModel.create(saveData)
            result = {
                longUrl: saveUrl.longUrl,
                shortUrl: saveUrl.shortUrl,
                urlCode: saveUrl.urlCode
            }

            await SET_ASYNC(`${longUrl}`, JSON.stringify(result))

            return res.status(201).send({ status: true, message: "successfully Generated", data: result })
        }
    }
    catch (err) {
        res.status(500).send({ msg: err.message })
    }

}


//2 Api
//-------------------------------------------------Get/:urlCode------------------------------------------------------------//

const getUrl = async function (req, res) {

    try {
        const urlCode = req.params.urlCode;
        console.log(urlCode)

        let cacheUrlcode = await GET_ASYNC(`${urlCode}`);

        let value = JSON.parse(cacheUrlcode)

        if (value) {
            return res.status(302).redirect(value.longUrl);
        }
        else {
            const data = await urlModel.findOne({ urlCode: urlCode })
            console.log(data)

            if (!data) {
                return res.status(404).send({ status: false, msg: "Url Not Found." })
            }
            await SET_ASYNC(`${urlCode}`, JSON.stringify(data));
            return res.status(302).redirect(data.longUrl)
        }
    }
    catch (err) {
        res.status(500).send({ msg: err.message })
    }
}


module.exports = { createUrl, getUrl}






