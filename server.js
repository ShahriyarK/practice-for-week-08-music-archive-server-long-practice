const http = require("http");
const fs = require("fs");

// NOTE: Server documentation is in the promises directory in its own practice directory
/* ============================ SERVER DATA ============================ */
let artists = JSON.parse(fs.readFileSync("./seeds/artists.json"));
let albums = JSON.parse(fs.readFileSync("./seeds/albums.json"));
let songs = JSON.parse(fs.readFileSync("./seeds/songs.json"));

let nextArtistId = 2;
let nextAlbumId = 2;
let nextSongId = 2;

// returns an artistId for a new artist
function getNewArtistId() {
  const newArtistId = nextArtistId;
  nextArtistId++;
  return newArtistId;
}

// returns an albumId for a new album
function getNewAlbumId() {
  const newAlbumId = nextAlbumId;
  nextAlbumId++;
  return newAlbumId;
}

// returns an songId for a new song
function getNewSongId() {
  const newSongId = nextSongId;
  nextSongId++;
  return newSongId;
}

function unprocessableBodyError(res) {
  res.statusCode = 422;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      message: "Something is wrong with the body",
      statusCode: 422,
    })
  );
}

function notFoundError(res, message) {
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      message,
      statusCode: 404,
    })
  );
}

/* ======================= PROCESS SERVER REQUESTS ======================= */
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // assemble the request body
  let reqBody = "";
  req.on("data", (data) => {
    reqBody += data;
  });

  req.on("end", () => {
    // finished assembling the entire request body
    // Parsing the body of the request depending on the "Content-Type" header
    if (reqBody) {
      switch (req.headers["content-type"]) {
        case "application/json":
          req.body = JSON.parse(reqBody);
          break;
        case "application/x-www-form-urlencoded":
          req.body = reqBody
            .split("&")
            .map((keyValuePair) => keyValuePair.split("="))
            .map(([key, value]) => [key, value.replace(/\+/g, " ")])
            .map(([key, value]) => [key, decodeURIComponent(value)])
            .reduce((acc, [key, value]) => {
              acc[key] = value;
              return acc;
            }, {});
          break;
        default:
          break;
      }
      console.log(req.body);
    }

    /* ========================== ROUTE HANDLERS ========================== */

    // Your code here

    // GET all artists
    if (req.url === "/artists" && req.method === "GET") {
      res.setHeader("Content-Type", "application/json");
      res.statusCode = 200;
      return res.end(JSON.stringify(Object.values(artists)));
    }

    // GET all albums of a specific artist
    if (req.method === "GET" && req.url.startsWith("/artists/")) {
      const urlParts = req.url.split("/");
      const artistId = urlParts[2];
      const resource = urlParts[3];
      if (resource === "albums") {
        const artist = artists[artistId];
        if (!artist) return notFoundError(res, "Artist not found");
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        const artistAlbums = Object.values(albums).filter(
          (album) => album.artistId === Number(artistId)
        );
        return res.end(JSON.stringify(artistAlbums));
      }
    }

    // GET all songs of a specified artist
    if (req.method === "GET" && req.url.startsWith("/artists/")) {
      const urlParts = req.url.split("/");
      const artistId = urlParts[2];
      const resource = urlParts[3];
      const artist = artists[artistId];
      if (resource === "songs") {
        if (artist) {
          const artistSongs = Object.values(songs).filter((song) => {
            const album = albums[song.albumId];
            return album.artistId === Number(artistId);
          });
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(artistSongs));
        } else {
          notFoundError(res, "Artist not found");
        }
        return;
      }
    }

    // GET a specific artist's details
    if (req.method === "GET" && req.url.startsWith("/artists/")) {
      const urlParts = req.url.split("/");
      const artistId = urlParts[2];
      const artist = artists[artistId];
      const artistAlbums = Object.values(albums).filter(
        (album) => album.artistId === Number(artistId)
      );
      res.setHeader("Content-Type", "application/json");
      if (artist) {
        res.statusCode = 200;
        res.end(JSON.stringify({ ...artist, albums: artistAlbums }));
      } else {
        notFoundError(res, "Artist not found");
      }
      return;
    }

    // Add a new artist
    if (req.method === "POST" && req.url === "/artists") {
      if (req.body && req.body.name) {
        const { name } = req.body;
        const artistId = getNewArtistId();
        artists[artistId] = {
          artistId,
          name,
        };
        res.setHeader("Content-Type", "application/json");
        res.statusCode = 201;
        return res.end(JSON.stringify(artists[artistId]));
      } else {
        return unprocessableBodyError(res);
      }
    }

    // Edit a specific artist
    if (
      (req.method === "PUT" || req.method === "PATCH") &&
      req.url.startsWith("/artists/")
    ) {
      if (req.body && req.body.name) {
        const { name } = req.body;
        const urlParts = req.url.split("/");
        const artistId = urlParts[2];
        const artistToUpdate = artists[artistId];
        if (artistToUpdate) {
          artistToUpdate.name = name;
          artistToUpdate.updatedAt = new Date().toISOString();
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(artistToUpdate));
          return;
        }
        notFoundError(res, "Artist not found");
      } else {
        unprocessableBodyError(res);
      }
      return;
    }

    // Delete an artist
    if (req.method === "DELETE" && req.url.startsWith("/artists/")) {
      const urlParts = req.url.split("/");
      const artistId = urlParts[2];
      const artistToDelete = artists[artistId];
      if (artistToDelete) {
        delete artists[artistId];
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            message: "Successfully deleted",
          })
        );
      } else {
        notFoundError(res, "Artist not found");
      }
      return;
    }

    // Add an album to a specific artist
    if (req.method === "POST" && req.url.startsWith("/artists/")) {
      const urlParts = req.url.split("/");
      const artistId = urlParts[2];
      const resource = urlParts[3];
      if (resource === "albums") {
        if (!artists[artistId]) {
          notFoundError(res, "Artist not found");
        } else if (req.body?.name) {
          const albumId = getNewAlbumId();
          albums[albumId] = {
            name: req.body.name,
            artistId: Number(artistId),
            albumId,
          };
          res.statusCode = 201;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(albums[albumId]));
        } else {
          unprocessableBodyError(res);
        }
        return;
      }
    }

    // GET all songs of a specified album
    if (req.method === "GET" && req.url.startsWith("/albums/")) {
      const urlParts = req.url.split("/");
      const albumId = urlParts[2];
      const resource = urlParts[3];
      if (resource === "songs") {
        const album = albums[albumId];
        if (album) {
          const albumSongs = Object.values(songs).filter(
            (song) => song.albumId === Number(albumId)
          );
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(albumSongs));
        } else {
          notFoundError(res, "Album not found");
        }
        return;
      }
    }

    // GET a specific album's details
    if (req.method === "GET" && req.url.startsWith("/albums/")) {
      const urlParts = req.url.split("/");
      const albumId = urlParts[2];
      const album = albums[albumId];
      if (album) {
        const artist = Object.values(artists).find(
          (artist) => artist.artistId === album.artistId
        );
        const albumSongs = Object.values(songs).filter(
          (song) => song.albumId === Number(albumId)
        );
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ ...album, artist, songs: albumSongs }));
      } else {
        notFoundError(res, "Album not found");
      }
      return;
    }

    // Edit a specified album
    if (
      (req.method === "PUT" || req.method === "PATCH") &&
      req.url.startsWith("/albums/")
    ) {
      const urlParts = req.url.split("/");
      const albumId = urlParts[2];
      const album = albums[albumId];
      if (!album) {
        return notFoundError(res, "Album not found");
      }
      if (req.body && req.body.name) {
        album.name = req.body.name;
        album.updatedAt = new Date().toISOString();
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify(album));
      } else {
        return unprocessableBodyError(res);
      }
    }

    // DELETE a specified album
    if (req.method === "DELETE" && req.url.startsWith("/albums/")) {
      const urlParts = req.url.split("/");
      const albumId = urlParts[2];
      const album = albums[albumId];
      if (album) {
        delete albums[albumId];
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            message: "Successfully deleted",
          })
        );
      } else {
        notFoundError(res, "Album not found");
      }
      return;
    }

    // Add a song to a specific album
    if (req.method === "POST" && req.url.startsWith("/albums/")) {
      const urlParts = req.url.split("/");
      const albumId = urlParts[2];
      const resource = urlParts[3];
      if (resource === "songs") {
        const album = albums[albumId];
        if (!album) return notFoundError(res, "Album not found");
        // only name is the required property
        if (req.body && req.body.name) {
          const { name, lyrics, trackNumber } = req.body;
          const songId = getNewSongId();
          songs[songId] = {
            songId,
            name,
            lyrics: lyrics ?? null,
            trackNumber: trackNumber ?? null,
            albumId: Number(albumId),
          };
          res.statusCode = 201;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(songs[songId]));
        } else {
          unprocessableBodyError(res);
        }
        return;
      }
    }

    // GET all songs of a specified track number
    if (req.method === "GET" && req.url.startsWith("/trackNumbers/")) {
      const urlParts = req.url.split("/");
      const trackNumber = urlParts[2];
      const resource = urlParts[3];
      if (resource === "songs") {
        const trackSongs = Object.values(songs).filter(
          (song) => song.trackNumber === Number(trackNumber)
        );
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(trackSongs));
        return;
      }
    }

    // GET details of a specified song
    if (req.method === "GET" && req.url.startsWith("/songs/")) {
      const urlParts = req.url.split("/");
      const songId = urlParts[2];
      const song = songs[songId];
      if (song) {
        const album = albums[song.albumId];
        const artist = artists[album.artistId];
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            ...song,
            artist,
            album,
          })
        );
        return;
      } else {
        return notFoundError(res, "Song not found");
      }
    }

    // Edit a specified song
    if (
      (req.method === "PUT" || req.method === "PATCH") &&
      req.url.startsWith("/songs/")
    ) {
      const urlParts = req.url.split("/");
      const songId = urlParts[2];
      const song = songs[songId];
      if (req.body && req.body.name) {
        if (song) {
          const { name, lyrics, trackNumber } = req.body;
          song.name = name;
          song.lyrics = lyrics ?? song.lyrics;
          song.trackNumber = trackNumber ?? song.trackNumber;
          song.updatedAt = new Date().toISOString();
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify(song));
        } else {
          return notFoundError(res, "Song not found");
        }
      } else {
        return unprocessableBodyError(res);
      }
    }

    // DELETE a specified song
    if (req.method === "DELETE" && req.url.startsWith("/songs/")) {
      const urlParts = req.url.split("/");
      const songId = urlParts[2];
      const song = songs[songId];
      if (song) {
        delete songs[songId];
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            message: "Succesfully deleted",
          })
        );
      } else {
        notFoundError("Song not found");
      }
      return;
    }

    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    res.write("Endpoint not found");
    return res.end();
  });
});

const port = process.env.PORT || 5000;

server.listen(port, () => console.log("Server is listening on port", port));
