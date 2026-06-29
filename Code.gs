function testAuthorizationOnly() {
  UrlFetchApp.fetch('https://www.google.com');
  return 'done';
}

const TRAVIL_APP = {
  propertyKey: 'TRAVIL_SPREADSHEET_ID',
  spreadsheetId: '19g6JXu9yMLws_5Gwwj7OL7K8k25g64qf0sdFHMX2kpo',
  sheets: {
    trips: {
      name: 'Trips',
      headers: ['TripId', 'CreatedAt', 'Country', 'City', 'StartDate', 'EndDate', 'Language', 'Notes']
    },
    stays: {
      name: 'Stays',
      headers: ['StayId', 'TripId', 'CreatedAt', 'Name', 'Country', 'City', 'Address', 'Phone', 'Room', 'MapUrl', 'Notes', 'IsCurrent']
    },
    locations: {
      name: 'Locations',
      headers: ['LocationId', 'TripId', 'CreatedAt', 'Label', 'PlaceName', 'Address', 'Latitude', 'Longitude', 'Accuracy', 'MapUrl', 'Notes']
    },
    places: {
      name: 'VisitedPlaces',
      headers: ['PlaceId', 'TripId', 'CreatedAt', 'Name', 'Type', 'Country', 'City', 'Address', 'Rating', 'WouldReturn', 'Recommended', 'Notes', 'Source']
    },
    feedback: {
      name: 'Feedback',
      headers: ['FeedbackId', 'TripId', 'PlaceId', 'CreatedAt', 'PlaceName', 'PlaceType', 'Country', 'City', 'Rating', 'WouldReturn', 'RecommendAgain', 'PriceLevel', 'WithWho', 'WhatILiked', 'WhatIDisliked', 'Notes']
    },
    flights: {
      name: 'Flights',
      headers: ['FlightId', 'TripId', 'CreatedAt', 'FlightNumber', 'FlightDate', 'FromAirport', 'ToAirport', 'DepartureTime', 'ArrivalTime', 'Status', 'Notes']
    },
    phrases: {
      name: 'SavedPhrases',
      headers: ['PhraseId', 'TripId', 'CreatedAt', 'OriginalText', 'TranslatedText', 'TargetLanguage', 'Context', 'IsFavorite']
    },
    emergency: {
      name: 'EmergencyInfo',
      headers: ['EmergencyId', 'TripId', 'UpdatedAt', 'ContactName', 'ContactPhone', 'Insurance', 'MedicalNotes', 'PassportNotes', 'LocalEmergencyNumber', 'Notes']
    }
  }
};

function doGet() {
  ensureDatabase_();
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Travil')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

function setupDatabase() {
  const spreadsheet = ensureDatabase_();
  return {
    ok: true,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetUrl: spreadsheet.getUrl(),
    message: 'Travil database is ready'
  };
}

function getDashboard() {
  const spreadsheet = ensureDatabase_();
  return {
    ok: true,
    spreadsheetUrl: spreadsheet.getUrl(),
    trips: readObjects_(spreadsheet, TRAVIL_APP.sheets.trips.name),
    stays: readObjects_(spreadsheet, TRAVIL_APP.sheets.stays.name),
    locations: readObjects_(spreadsheet, TRAVIL_APP.sheets.locations.name),
    places: readObjects_(spreadsheet, TRAVIL_APP.sheets.places.name),
    feedback: readObjects_(spreadsheet, TRAVIL_APP.sheets.feedback.name),
    flights: readObjects_(spreadsheet, TRAVIL_APP.sheets.flights.name),
    phrases: readObjects_(spreadsheet, TRAVIL_APP.sheets.phrases.name),
    emergency: readObjects_(spreadsheet, TRAVIL_APP.sheets.emergency.name)
  };
}

function saveTrip(payload) {
  const row = appendObject_('trips', {
    TripId: payload.tripId || makeId_('TRIP'),
    CreatedAt: new Date(),
    Country: payload.country,
    City: payload.city,
    StartDate: payload.startDate,
    EndDate: payload.endDate,
    Language: payload.language,
    Notes: payload.notes
  });
  return { ok: true, item: row };
}

function saveStay(payload) {
  if (payload.isCurrent) {
    clearCurrentStay_(payload.tripId);
  }

  const mapUrl = payload.mapUrl || resolveMapUrlFromAddress_([payload.name, payload.address, payload.city, payload.country]);

  const row = appendObject_('stays', {
    StayId: payload.stayId || makeId_('STAY'),
    TripId: payload.tripId,
    CreatedAt: new Date(),
    Name: payload.name,
    Country: payload.country,
    City: payload.city,
    Address: payload.address,
    Phone: payload.phone,
    Room: payload.room,
    MapUrl: mapUrl,
    Notes: payload.notes,
    IsCurrent: payload.isCurrent ? 'YES' : 'NO'
  });
  return { ok: true, item: row };
}

function saveCurrentLocation(payload) {
  const latitude = payload.latitude || '';
  const longitude = payload.longitude || '';
  const mapUrl = latitude && longitude
    ? 'https://www.google.com/maps?q=' + latitude + ',' + longitude
    : payload.mapUrl;
  const resolved = resolveLocationName_(latitude, longitude);

  const row = appendObject_('locations', {
    LocationId: payload.locationId || makeId_('LOC'),
    TripId: payload.tripId,
    CreatedAt: new Date(),
    Label: payload.label || resolved.placeName || 'Current location',
    PlaceName: resolved.placeName,
    Address: resolved.address,
    Latitude: latitude,
    Longitude: longitude,
    Accuracy: payload.accuracy,
    MapUrl: mapUrl,
    Notes: payload.notes
  });
  return { ok: true, item: row };
}

function savePlace(payload) {
  const row = appendObject_('places', {
    PlaceId: payload.placeId || makeId_('PLACE'),
    TripId: payload.tripId,
    CreatedAt: new Date(),
    Name: payload.name,
    Type: payload.type,
    Country: payload.country,
    City: payload.city,
    Address: payload.address,
    Rating: payload.rating,
    WouldReturn: payload.wouldReturn ? 'YES' : 'NO',
    Recommended: payload.recommended ? 'YES' : 'NO',
    Notes: payload.notes,
    Source: payload.source || 'manual'
  });
  return { ok: true, item: row };
}

function saveFeedback(payload) {
  const row = appendObject_('feedback', {
    FeedbackId: payload.feedbackId || makeId_('FDBK'),
    TripId: payload.tripId,
    PlaceId: payload.placeId,
    CreatedAt: new Date(),
    PlaceName: payload.placeName,
    PlaceType: payload.placeType,
    Country: payload.country,
    City: payload.city,
    Rating: payload.rating,
    WouldReturn: payload.wouldReturn ? 'YES' : 'NO',
    RecommendAgain: payload.recommendAgain ? 'YES' : 'NO',
    PriceLevel: payload.priceLevel,
    WithWho: payload.withWho,
    WhatILiked: payload.whatILiked,
    WhatIDisliked: payload.whatIDisliked,
    Notes: payload.notes
  });
  return { ok: true, item: row };
}

function saveFlight(payload) {
  const row = appendObject_('flights', {
    FlightId: payload.flightId || makeId_('FLT'),
    TripId: payload.tripId,
    CreatedAt: new Date(),
    FlightNumber: payload.flightNumber,
    FlightDate: payload.flightDate,
    FromAirport: payload.fromAirport,
    ToAirport: payload.toAirport,
    DepartureTime: payload.departureTime,
    ArrivalTime: payload.arrivalTime,
    Status: payload.status || 'Saved',
    Notes: payload.notes
  });
  return { ok: true, item: row };
}

function saveEmergencyInfo(payload) {
  const row = appendObject_('emergency', {
    EmergencyId: payload.emergencyId || makeId_('EMG'),
    TripId: payload.tripId,
    UpdatedAt: new Date(),
    ContactName: payload.contactName,
    ContactPhone: payload.contactPhone,
    Insurance: payload.insurance,
    MedicalNotes: payload.medicalNotes,
    PassportNotes: payload.passportNotes,
    LocalEmergencyNumber: payload.localEmergencyNumber,
    Notes: payload.notes
  });
  return { ok: true, item: row };
}

function deleteSavedItem(payload) {
  const map = {
    trip: { sheetKey: 'trips', idHeader: 'TripId' },
    stay: { sheetKey: 'stays', idHeader: 'StayId' },
    location: { sheetKey: 'locations', idHeader: 'LocationId' },
    place: { sheetKey: 'places', idHeader: 'PlaceId' },
    feedback: { sheetKey: 'feedback', idHeader: 'FeedbackId' },
    phrase: { sheetKey: 'phrases', idHeader: 'PhraseId' },
    flight: { sheetKey: 'flights', idHeader: 'FlightId' },
    emergency: { sheetKey: 'emergency', idHeader: 'EmergencyId' }
  };

  const type = payload.type;
  const id = payload.id;
  const definition = map[type];

  if (!definition || !id) {
    return { ok: false, error: 'Missing item type or id' };
  }

  const deleted = deleteRowById_(definition.sheetKey, definition.idHeader, id);

  if (type === 'trip' && deleted) {
    deleteRowsByValue_('stays', 'TripId', id);
    deleteRowsByValue_('locations', 'TripId', id);
    deleteRowsByValue_('places', 'TripId', id);
    deleteRowsByValue_('feedback', 'TripId', id);
    deleteRowsByValue_('flights', 'TripId', id);
    deleteRowsByValue_('phrases', 'TripId', id);
    deleteRowsByValue_('emergency', 'TripId', id);
  }

  return { ok: deleted, deleted };
}

function translateText(payload) {
  const sourceLanguage = payload.sourceLanguage || 'iw';
  const targetLanguage = payload.targetLanguage || 'en';
  const text = String(payload.text || '').trim();

  if (!text) {
    return { ok: false, error: 'No text to translate' };
  }

  const translatedText = LanguageApp.translate(text, sourceLanguage, targetLanguage);

  if (payload.savePhrase) {
    appendObject_('phrases', {
      PhraseId: makeId_('PHR'),
      TripId: payload.tripId,
      CreatedAt: new Date(),
      OriginalText: text,
      TranslatedText: translatedText,
      TargetLanguage: targetLanguage,
      Context: payload.context,
      IsFavorite: payload.isFavorite ? 'YES' : 'NO'
    });
  }

  return {
    ok: true,
    originalText: text,
    translatedText,
    targetLanguage
  };
}

function searchMemory(query) {
  const text = String(query || '').toLowerCase().trim();
  const dashboard = getDashboard();

  if (!text) {
    return { ok: true, results: [] };
  }

  const sources = [
    { type: 'trip', rows: dashboard.trips },
    { type: 'stay', rows: dashboard.stays },
    { type: 'location', rows: dashboard.locations },
    { type: 'place', rows: dashboard.places },
    { type: 'feedback', rows: dashboard.feedback },
    { type: 'flight', rows: dashboard.flights },
    { type: 'phrase', rows: dashboard.phrases }
  ];

  const results = [];
  sources.forEach(source => {
    source.rows.forEach(row => {
      const haystack = Object.keys(row).map(key => row[key]).join(' ').toLowerCase();
      if (haystack.indexOf(text) !== -1) {
        results.push({ type: source.type, row });
      }
    });
  });

  return { ok: true, results };
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getFlightStatus(payload) {
  try {
    payload = payload || {};
    const apiKey = PropertiesService.getScriptProperties().getProperty('RAPIDAPI_KEY');
    if (!apiKey) {
      return { ok: false, error: 'מפתח RapidAPI לא מוגדר במאפייני הסקריפט (RAPIDAPI_KEY)' };
    }

    const flightNumber = String(payload.flightNumber || '').trim().replace(/\s+/g, '');
    if (!flightNumber) {
      return { ok: false, error: 'נא להזין מספר טיסה' };
    }

    const host = 'aerodatabox.p.rapidapi.com';
    let url = 'https://' + host + '/flights/number/' + encodeURIComponent(flightNumber);
    if (payload.flightDate) {
      url += '/' + encodeURIComponent(payload.flightDate);
    }

    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': host
      },
      muteHttpExceptions: true
    });

    const status = response.getResponseCode();
    const bodyText = response.getContentText();

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (parseErr) {
      data = null;
    }

    if (status < 200 || status >= 300) {
      const message = (data && (data.message || data.error)) || bodyText.slice(0, 200);
      throw new Error('שגיאה משירות הסטטוס (קוד ' + status + '): ' + message);
    }

    let flights;
    if (Array.isArray(data)) {
      flights = data;
    } else if (data && Array.isArray(data.data)) {
      flights = data.data;
    } else if (data && typeof data === 'object' && Object.keys(data).length) {
      flights = [data];
    } else {
      flights = [];
    }

    if (!flights.length) {
      return {
        ok: false,
        error: 'לא נמצא מידע על הטיסה הזו. קוד תשובה: ' + status + ', אורך תשובה: ' + bodyText.length + ', תוכן: "' + bodyText.slice(0, 300) + '", כתובת שנשלחה: ' + url
      };
    }

    const flight = flights[0];
    const departure = flight.departure || {};
    const arrival = flight.arrival || {};
    const airline = flight.airline || {};

    return {
      ok: true,
      status: flight.status || '',
      airline: airline.name || '',
      flightNumber: flight.number || flightNumber,
      departure: formatFlightLeg_(departure),
      arrival: formatFlightLeg_(arrival)
    };
  } catch (err) {
    return { ok: false, error: 'שגיאה בבדיקת סטטוס הטיסה: ' + (err && err.message ? err.message : String(err)) };
  }
}

function formatFlightLeg_(leg) {
  const airport = leg.airport || {};
  const scheduled = leg.scheduledTime || {};
  const revised = leg.revisedTime || {};
  const actual = leg.actualTime || {};

  return {
    airport: airport.iata || airport.name || '',
    scheduled: scheduled.local || '',
    estimated: revised.local || '',
    actual: actual.local || '',
    terminal: leg.terminal || '',
    gate: leg.gate || '',
    delayMinutes: ''
  };
}

function planDay(payload) {
  try {
    payload = payload || {};
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey) {
      return { ok: false, error: 'מפתח Gemini לא מוגדר במאפייני הסקריפט (GEMINI_API_KEY)' };
    }

    const city = String(payload.city || '').trim();
    if (!city) {
      return { ok: false, error: 'נא להזין עיר לפני הכנת המסלול' };
    }

    const prompt = buildDayPlanPrompt_(payload, city);
    const stops = callGeminiForDayPlan_(apiKey, prompt);

    if (!stops.length) {
      return { ok: false, error: 'לא התקבלו עצירות במסלול, נסה לשנות את הבקשה' };
    }

    return { ok: true, itinerary: stops };
  } catch (err) {
    return { ok: false, error: 'שגיאה בהכנת המסלול: ' + (err && err.message ? err.message : String(err)) };
  }
}

function buildDayPlanPrompt_(payload, city) {
  const lines = [];
  lines.push('אתה עוזר תכנון טיולים מקצועי. תכנן יום טיול אחד בעברית בלבד, על בסיס הפרטים הבאים.');
  lines.push('עיר: ' + city);

  if (payload.latitude && payload.longitude) {
    lines.push('המטייל נמצא כרגע בקואורדינטות: ' + payload.latitude + ', ' + payload.longitude + '. אם רלוונטי, התחל את המסלול מהאזור הזה.');
  }

  lines.push('סוג היום המבוקש: ' + (payload.dayType || 'לא צויין'));
  lines.push('אמצעי תחבורה מועדף: ' + (payload.transport || 'לא צויין'));
  lines.push('תקציב: ' + (payload.budget || 'לא צויין'));
  lines.push('שעת התחלה: ' + (payload.startTime || 'לא צויין'));
  lines.push('שעת סיום: ' + (payload.endTime || 'לא צויין'));

  if (payload.specialRequests) {
    lines.push('בקשות מיוחדות: ' + payload.specialRequests);
  }

  lines.push('הנחיות חשובות שעליך לעמוד בהן:');
  lines.push('- בנה בין 4 ל-7 עצירות בלבד, לא יותר ולא פחות.');
  lines.push('- סדר את העצירות בצורה הגיונית לפי אזורים ומרחקים, כדי למזער נסיעות מיותרות בין עצירות.');
  lines.push('- שלב ארוחה או הפסקת מנוחה בזמן מתאים ביום, בהתאם לשעות שצוינו.');
  lines.push('- אם אינך בטוח בשעות פתיחה, כתובת מדויקת או מחיר מדויק, אל תמציא אותם. כתוב הערכה כללית בלבד או ציין שאינך בטוח.');
  lines.push('- כל הטקסטים חייבים להיות בעברית בלבד.');
  lines.push('החזר את התשובה כ-JSON תקני בלבד, בלי שום טקסט נוסף לפני או אחרי, במבנה המדויק הזה:');
  lines.push(JSON.stringify({
    stops: [
      {
        time: 'HH:MM',
        name: 'שם המקום',
        type: 'סוג המקום',
        description: 'תיאור קצר',
        area: 'אזור או כתובת כללית',
        durationMinutes: 60,
        estimatedCost: 'הערכת עלות כללית',
        transportTip: 'המלצת תחבורה לעצירה הזו'
      }
    ]
  }));

  return lines.join('\n');
}

function callGeminiForDayPlan_(apiKey, prompt) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(apiKey);
  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  };

  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  });

  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error('שגיאה מ-Gemini (קוד ' + status + ')');
  }

  const data = JSON.parse(response.getContentText());
  const candidate = data && data.candidates && data.candidates[0];
  const partText = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;

  if (!partText) {
    throw new Error('לא התקבלה תשובה תקינה מ-Gemini');
  }

  let parsed;
  try {
    parsed = JSON.parse(partText);
  } catch (parseErr) {
    throw new Error('התשובה מ-Gemini לא הייתה JSON תקין');
  }

  const stops = (parsed && Array.isArray(parsed.stops)) ? parsed.stops : [];

  return stops.map(function (stop) {
    return {
      time: stop.time || '',
      name: stop.name || '',
      type: stop.type || '',
      description: stop.description || '',
      area: stop.area || '',
      durationMinutes: stop.durationMinutes || '',
      estimatedCost: stop.estimatedCost || '',
      transportTip: stop.transportTip || ''
    };
  });
}

function ensureDatabase_() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = TRAVIL_APP.spreadsheetId || properties.getProperty(TRAVIL_APP.propertyKey);
  let spreadsheet;

  if (spreadsheetId) {
    try {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } catch (err) {
      spreadsheet = null;
    }
  }

  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.create('Travil Database');
    properties.setProperty(TRAVIL_APP.propertyKey, spreadsheet.getId());
  } else {
    properties.setProperty(TRAVIL_APP.propertyKey, spreadsheet.getId());
  }

  Object.keys(TRAVIL_APP.sheets).forEach(key => {
    ensureSheet_(spreadsheet, TRAVIL_APP.sheets[key]);
  });

  return spreadsheet;
}

function ensureSheet_(spreadsheet, definition) {
  let sheet = spreadsheet.getSheetByName(definition.name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(definition.name);
  }

  const currentHeaders = sheet.getRange(1, 1, 1, definition.headers.length).getValues()[0];
  const needsHeaders = definition.headers.some((header, index) => currentHeaders[index] !== header);

  if (needsHeaders) {
    sheet.clear();
    sheet.getRange(1, 1, 1, definition.headers.length).setValues([definition.headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, definition.headers.length)
      .setFontWeight('bold')
      .setBackground('#143D59')
      .setFontColor('#ffffff');
    sheet.autoResizeColumns(1, definition.headers.length);
  }

  return sheet;
}

function appendObject_(sheetKey, values) {
  const spreadsheet = ensureDatabase_();
  const definition = TRAVIL_APP.sheets[sheetKey];
  const sheet = spreadsheet.getSheetByName(definition.name);
  const row = definition.headers.map(header => values[header] || '');
  sheet.appendRow(row);
  return objectFromRow_(definition.headers, row);
}

function readObjects_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }

  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
  const headers = values.shift();
  return values.map(row => objectFromRow_(headers, row));
}

function objectFromRow_(headers, row) {
  return headers.reduce((item, header, index) => {
    item[header] = row[index] || '';
    return item;
  }, {});
}

function clearCurrentStay_(tripId) {
  const spreadsheet = ensureDatabase_();
  const sheet = spreadsheet.getSheetByName(TRAVIL_APP.sheets.stays.name);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const tripIndex = headers.indexOf('TripId');
  const currentIndex = headers.indexOf('IsCurrent');

  for (let row = 1; row < values.length; row++) {
    if (!tripId || values[row][tripIndex] === tripId) {
      sheet.getRange(row + 1, currentIndex + 1).setValue('NO');
    }
  }
}

function deleteRowById_(sheetKey, idHeader, id) {
  const spreadsheet = ensureDatabase_();
  const sheet = spreadsheet.getSheetByName(TRAVIL_APP.sheets[sheetKey].name);
  if (!sheet || sheet.getLastRow() < 2) {
    return false;
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idIndex = headers.indexOf(idHeader);
  if (idIndex === -1) {
    return false;
  }

  for (let row = values.length - 1; row >= 1; row--) {
    if (String(values[row][idIndex]) === String(id)) {
      sheet.deleteRow(row + 1);
      return true;
    }
  }

  return false;
}

function deleteRowsByValue_(sheetKey, headerName, value) {
  const spreadsheet = ensureDatabase_();
  const sheet = spreadsheet.getSheetByName(TRAVIL_APP.sheets[sheetKey].name);
  if (!sheet || sheet.getLastRow() < 2) {
    return 0;
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const index = headers.indexOf(headerName);
  if (index === -1) {
    return 0;
  }

  let deleted = 0;
  for (let row = values.length - 1; row >= 1; row--) {
    if (String(values[row][index]) === String(value)) {
      sheet.deleteRow(row + 1);
      deleted++;
    }
  }

  return deleted;
}

function resolveMapUrlFromAddress_(addressParts) {
  const query = addressParts.filter(Boolean).join(', ').trim();
  if (!query) {
    return '';
  }

  try {
    const response = Maps.newGeocoder().setLanguage('he').geocode(query);
    if (!response || !response.results || !response.results.length) {
      return '';
    }

    const location = response.results[0].geometry && response.results[0].geometry.location;
    if (!location) {
      return '';
    }

    return 'https://www.google.com/maps?q=' + location.lat + ',' + location.lng;
  } catch (err) {
    return '';
  }
}

function resolveLocationName_(latitude, longitude) {
  const empty = { placeName: '', address: '' };
  if (!latitude || !longitude) {
    return empty;
  }

  try {
    const response = Maps.newGeocoder()
      .setLanguage('he')
      .reverseGeocode(Number(latitude), Number(longitude));

    if (!response || !response.results || !response.results.length) {
      return empty;
    }

    const first = response.results[0];
    const address = first.formatted_address || '';
    const placeName = pickLocationName_(first.address_components) || address;
    return { placeName, address };
  } catch (err) {
    return empty;
  }
}

function pickLocationName_(components) {
  if (!components || !components.length) {
    return '';
  }

  const preferredTypes = [
    'point_of_interest',
    'establishment',
    'neighborhood',
    'locality',
    'administrative_area_level_3',
    'administrative_area_level_2'
  ];

  for (let i = 0; i < preferredTypes.length; i++) {
    const match = components.find(component => component.types && component.types.indexOf(preferredTypes[i]) !== -1);
    if (match) {
      return match.long_name || match.short_name || '';
    }
  }

  return components[0].long_name || components[0].short_name || '';
}

function makeId_(prefix) {
  const token = Utilities.getUuid().split('-')[0].toUpperCase();
  return prefix + '-' + token;
}
