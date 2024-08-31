const express = require("express");
const axios = require("axios");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const CUSTOMCONNSTR_GEOCODE_API_KEY = process.env.CUSTOMCONNSTR_GEOCODE_API_KEY;
const CUSTOMCONNSTR_ORS_API_KEY = process.env.CUSTOMCONNSTR_ORS_API_KEY;

const fetchGeocode = async (address) => {
  const { data } = await axios.get(`https://geocode.maps.co/search`, {
    params: { q: address, api_key: CUSTOMCONNSTR_GEOCODE_API_KEY },
  });
  return [data[0].lat, data[0].lon];
};

const fetchIsochrone = async (lat, lon, mode, minutes) => {
  const { data } = await axios.post(
    `https://api.openrouteservice.org/v2/isochrones/${mode}`,
    {
      locations: [[lon, lat]],
      range: [minutes * 60],
    },
    {
      headers: {
        Accept:
          "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
        Authorization: `Bearer ${CUSTOMCONNSTR_ORS_API_KEY}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  );
  return data;
};


app.post("/api/isochrone", async (req, res) => {
  const { address, modeOfTransportation, minutes } = req.body.formData;

  try {
    const [lat, lon] = await fetchGeocode(address);
    const isochroneData = await fetchIsochrone(
      lat,
      lon,
      modeOfTransportation,
      minutes
    );
    res.json(isochroneData);
  } catch (error) {
    res
      .status(500)
      .json({ message: error.message, details: "Isochrone Fetch Error" });
  }
});



app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
