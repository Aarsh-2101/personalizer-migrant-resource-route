import { useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, GeoJSON, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUtensils,
  faScaleBalanced,
  faMoneyBillWheat,
  faInfo,
  faDoorOpen,
} from "@fortawesome/free-solid-svg-icons";
import * as turf from "@turf/turf";
const App = () => {
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    modeOfTransportation: "",
    minutes: "",
    food: false,
    legal: false,
    pantries: false,
    communitySupport: false,
    welcomingCenters: false,
  });

  const [latitudes, setLatitudes] = useState([]);
  const [longitudes, setLongitudes] = useState([]);
  const [resources, setResources] = useState([]);
  const [items, setItems] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [mobiles, setMobiles] = useState([]);

  const [isochroneData, setIsochroneData] = useState(null);
  const [center, setCenter] = useState([41.8858, -87.6229]); // Default center is Chicago
  const [addressPosition, setAddressPosition] = useState(null);
  const [error, setError] = useState(null);
  const [resourceData, setResourceData] = useState(null);

  const handleFileRead = (fileName) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").slice(1); // Skip header

      const latitudesArray = [];
      const longitudesArray = [];
      const resourcesArray = [];
      const itemsArray = [];
      const addressesArray = [];
      const websitesArray = [];
      const mobilesArray = [];

      lines.forEach((line) => {
        const fields = [];
        let field = "";
        let inQuotes = false;

        for (let char of line) {
          if (char === "," && !inQuotes) {
            fields.push(field.trim());
            field = "";
          } else if (char === '"') {
            inQuotes = !inQuotes;
          } else {
            field += char;
          }
        }
        fields.push(field.trim()); // Add the last field

        if (fields.length > 6) {
          latitudesArray.push(fields[3]);
          longitudesArray.push(fields[4]);
          resourcesArray.push(fields[1]);
          itemsArray.push(fields[2]);
          addressesArray.push(fields[5]);
          websitesArray.push(fields[6]);
          mobilesArray.push(fields[7]);
        }
      });

      setLatitudes((prevLatitudes) => [...prevLatitudes, ...latitudesArray]);
      setLongitudes((prevLongitudes) => [
        ...prevLongitudes,
        ...longitudesArray,
      ]);
      setResources((prevResources) => [...prevResources, ...resourcesArray]);
      setItems((prevItems) => [...prevItems, ...itemsArray]);
      setAddresses((prevAddresses) => [...prevAddresses, ...addressesArray]);
      setWebsites((prevWebsites) => [...prevWebsites, ...websitesArray]);
      setMobiles((prevMobiles) => [...prevMobiles, ...mobilesArray]);
    };

    reader.onerror = (e) => {
      console.error("Error reading file:", e.target.error);
    };

    const file = new File([fileName], "file.txt", { type: "text/plain" });
    if (file) {
      reader.readAsText(file);
    }
  };

  const handleChange = async (e) => {
    const { id, type, checked, value } = e.target;

    if (id === "minutes") {
      const minutesValue = Math.max(1, Math.min(60, Number(value)));
      setFormData((prevData) => ({
        ...prevData,
        [id]: minutesValue,
      }));
    } else {
      const newValue = type === "checkbox" ? checked : value;
      setFormData((prevData) => ({
        ...prevData,
        [id]: newValue,
      }));

      if (type === "checkbox" && checked) {
        readTxtFile(id);
      }
    }
  };

  const checkBoxes = [
    { id: "../locations-txt/Community-Food-Share.txt", label: "Food" },
    { id: "../locations-txt/Legal-Support-Group.txt", label: "Legal Support" },
    { id: "../locations-txt/Quick-Pick-Pantries.txt", label: "Pantries" },
    {
      id: "../locations-txt/Community-Support-Group.txt",
      label: "Community Support",
    },
    {
      id: "../locations-txt/IL-Welcoming-Centers.txt",
      label: "Welcoming Centers",
    },
  ];

  const readTxtFile = async (fileName) => {
    try {
      const response = await axios.get(fileName);
      handleFileRead(response.data);
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resourceInfo = {
      lats: latitudes,
      longs: longitudes,
      resources: resources,
      names: items,
      addresses: addresses,
      websites: websites,
      numbers: mobiles,
    };

    try {
      const response = await axios.post("http://localhost:4000/api/isochrone", {
        formData,
        resourceInfo,
      });
      setIsochroneData(response.data);

      // Uses address lat and long
      const lat = response.data.metadata.query.locations[0][1];
      const lng = response.data.metadata.query.locations[0][0];
      setCenter([lat, lng]);
      setAddressPosition([lat, lng]);

      // Filter resources within the isochrone
      const isochrone = response.data;
      const filteredResources = {
        lats: [],
        longs: [],
        resources: [],
        names: [],
        addresses: [],
        websites: [],
        mobiles: [],
      };

      latitudes.forEach((latitude, index) => {
        const point = [longitudes[index], latitude];
        if (isPointInIsochrone(point, isochrone)) {
          filteredResources.lats.push(latitude);
          filteredResources.longs.push(longitudes[index]);
          filteredResources.resources.push(resources[index]);
          filteredResources.names.push(items[index]);
          filteredResources.addresses.push(addresses[index]);
          filteredResources.websites.push(websites[index]);
          filteredResources.mobiles.push(mobiles[index]);
        }
      });
      // Update state with filtered resources
      setLatitudes(filteredResources.lats);
      setLongitudes(filteredResources.longs);
      setResources(filteredResources.resources);
      setItems(filteredResources.names);
      setAddresses(filteredResources.addresses);
      setWebsites(filteredResources.websites);
      setMobiles(filteredResources.mobiles);
      setResourceData(filteredResources);
    } catch (error) {
      console.error(
        "Error:",
        error.response ? error.response.data : error.message
      );
      setError(error.response ? error.response.data.message : error.message);
    }
  };

  const isPointInIsochrone = (point, isochrone) => {
    const pointTurf = turf.point(point);
    const polygonTurf = turf.polygon(
      isochrone.features[0].geometry.coordinates
    );
    return turf.booleanPointInPolygon(pointTurf, polygonTurf);
  };

  const handleMapPrint = () => {
    window.print();
  };

  const handleBackToForm = () => {
    setIsochroneData(null);
    setError(null);
    setAddressPosition(null);
    setFormData({
      address: "",
      modeOfTransportation: "",
      minutes: "",
      food: false,
      legal: false,
      pantries: false,
      communitySupport: false,
      welcomingCenters: false,
    });
    setResourceData([]); // Clear resource data when returning to the form
    setLatitudes([]);
    setLongitudes([]);
    setAddresses([]);
    setItems([]);
    setResources([]);
    setMobiles([]);
    setWebsites([]);
  };

  const markerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconSize: [15, 25],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    shadowSize: [41, 41],
  });

  return (
    <div className="flex justify-center items-center min-h-screen p-4 bg-custom-gradient">
      <div className="w-full max-w-4xl overflow-y-auto bg-white shadow-lg rounded-lg">
        <div className="p-6 sm:p-8">
          {isochroneData ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">
                {formData.name}'s Personalized Brochure
              </h2>
              <p className="text-gray-600 mb-2">
                This brochure contains information tailored to your needs based
                on your provided address and preferences.
              </p>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <MapContainer
                  center={center}
                  zoom={11}
                  style={{ height: "500px", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
                  />
                  <GeoJSON data={isochroneData} />
                  {addressPosition && (
                    <Marker position={addressPosition} icon={markerIcon}>
                      <Popup>{formData.address}</Popup>
                    </Marker>
                  )}
                  {resourceData &&
                    resourceData.lats.map((lat, index) => (
                      <Marker
                        key={index}
                        position={[lat, resourceData.longs[index]]}
                        icon={markerIcon}
                      >
                        <Popup>
                          <strong>{resourceData.names[index]}</strong>
                          <br />
                          {resourceData.addresses[index]}
                          <br />
                          <a
                            href={resourceData.websites[index]}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {resourceData.websites[index]}
                          </a>
                          <br />
                          {resourceData.mobiles[index]}
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </div>
              <div className="mt-6">
                <h3 className="text-xl font-bold mb-4">Filtered Resources</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resourceData &&
                    resourceData.lats.map((lat, index) => (
                      <div
                        key={index}
                        className="border p-4 rounded-md shadow-md bg-white"
                      >
                        <strong>{resourceData.names[index]}</strong>
                        <br />
                        {resourceData.addresses[index]}
                        <br />
                        <a
                          href={resourceData.websites[index]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 underline"
                        >
                          {resourceData.websites[index]}
                        </a>
                        <br />
                        {resourceData.mobiles[index]}
                      </div>
                    ))}
                </div>
              </div>
              <button
                onClick={handleMapPrint}
                className="mt-4 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition duration-300"
              >
                Print Map
              </button>
              <button
                onClick={handleBackToForm}
                className="mt-4 ml-4 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300"
              >
                Back to Form
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold mb-2">
                  Resource Request Form
                </h2>
                <p className="text-gray-600">
                  Please fill out the form below to provide the necessary
                  information for assistance.
                </p>
              </div>
              <form
                className="space-y-4 flex flex-col items-center"
                onSubmit={handleSubmit}
              >
                <div className="space-y-2 w-full max-w-lg">
                  <label htmlFor="name" className="block text-gray-700">
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    placeholder="Name"
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2 w-full max-w-lg">
                  <label htmlFor="address" className="block text-gray-700">
                    Current Address
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    placeholder="123 Main St, City, State, ZIP"
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2 w-full max-w-lg">
                  <label
                    htmlFor="modeOfTransportation"
                    className="block text-gray-700"
                  >
                    Mode of Transportation
                  </label>
                  <select
                    id="modeOfTransportation"
                    value={formData.modeOfTransportation}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>
                      Select mode of transportation
                    </option>
                    <option value="driving-car">Driving</option>
                    <option value="foot-walking">Walking</option>
                    <option value="cycling-regular">Cycling</option>
                  </select>
                </div>

                <div className="space-y-2 w-full max-w-lg">
                  <label htmlFor="minutes" className="block text-gray-700">
                    Minutes From Location
                  </label>
                  <input
                    id="minutes"
                    type="number"
                    min="1"
                    max="60"
                    value={formData.minutes}
                    placeholder="30 minutes"
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-4 w-full max-w-lg">
                  <label className="block text-gray-700">
                    What does the individual need?
                  </label>
                  {checkBoxes.map(({ id, label }) => (
                    <div key={id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={id}
                        checked={formData[id]}
                        onChange={handleChange}
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                      {id === "../locations-txt/Community-Food-Share.txt" && (
                        <FontAwesomeIcon
                          icon={faUtensils}
                          style={{ color: "#222831" }}
                          className="h-5 w-5"
                        />
                      )}
                      {id === "../locations-txt/Legal-Support-Group.txt" && (
                        <FontAwesomeIcon
                          icon={faScaleBalanced}
                          style={{ color: "#222831" }}
                          className="h-5 w-5"
                        />
                      )}
                      {id === "../locations-txt/Quick-Pick-Pantries.txt" && (
                        <FontAwesomeIcon
                          icon={faMoneyBillWheat}
                          style={{ color: "#222831" }}
                          className="h-5 w-5"
                        />
                      )}
                      {id ===
                        "../locations-txt/Community-Support-Group.txt" && (
                        <FontAwesomeIcon
                          icon={faInfo}
                          style={{ color: "#222831" }}
                          className="h-5 w-5"
                        />
                      )}
                      {id === "../locations-txt/IL-Welcoming-Centers.txt" && (
                        <FontAwesomeIcon
                          icon={faDoorOpen}
                          style={{ color: "#222831" }}
                          className="h-5 w-5"
                        />
                      )}
                      <label htmlFor={id} className="text-gray-700">
                        {label}
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center w-full max-w-lg">
                  <button
                    type="submit"
                    className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition duration-300"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </>
          )}
          {error && (
            <div className="text-center mt-4 text-red-500">
              <p>Error: {error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
