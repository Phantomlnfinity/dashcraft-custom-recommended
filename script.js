let tracks = [];
let loopcounter = 0;

function getTracks() {
  var fetches = [];
  // get verifieds
  for (let i = 0; i < 10; i++) {
    fetches.push(
      fetch("https://api.dashcraft.io/trackv2/global3?sort=new&verifiedOnly=true&page=" + i + "&pageSize=50")
        .then((response) => response.json())
        .then((json) => {

          let json1 = json.tracks;
          let IDarr = [];
          for (let a = 0; a < json1.length; a++) {
            IDarr.push(json1[a]._id);
          }
          return IDarr;
        }));
  }
  // get global
  if (!document.getElementById("checkbox").checked) {
    for (let i = 0; i < 500; i++) {
      fetches.push(
        fetch("https://api.dashcraft.io/trackv2/global3?sort=new&verifiedOnly=false&page=" + i + "&pageSize=50")
          .then((response) => response.json())
          .then((json) => {

            let json1 = json.tracks;
            let IDarr = [];
            for (let a = 0; a < json1.length; a++) {
              IDarr.push(json1[a]._id);
            }
            return IDarr;
          }));
    }
  }
  Promise.all(fetches)
    .then((IDL) => {
      var IDarr = [];
      for (let a = 0; a < IDL.length; a++) {
        for (let b = 0; b < IDL[a].length; b++) {
          if (!IDarr.includes(IDL[a][b])) {
            IDarr.push(IDL[a][b]);
          }
        }
      }
      getTrackInfo(IDarr)
    })
}

function getTrackInfo(IDarr) {
  console.log(IDarr)
  var fetches = [];
  var count = 0;
  for (let i = loopcounter*500; i < IDarr.length && i < 500+loopcounter*500; i++) {
    fetches.push(fetch("https://api.dashcraft.io/trackv2/" + IDarr[i] + "?supportsLaps1=true", {
      headers: {
        'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWM0NmMzNGExYmEyMjQyNGYyZTAwMzIiLCJpbnRlbnQiOiJvQXV0aCIsImlhdCI6MTcwNzM3MTU3Mn0.0JVw6gJhs4R7bQGjr8cKGLE7CLAGvyuMiee7yvpsrWg'
      }
    })
      .then((response) => response.json())
      .then((json) => {
        count += 1;
        document.getElementById("progress").innerHTML = "Fetching track info... (" + (count + loopcounter * 500) + "/" + IDarr.length + ")";
        return json
      })
    )

    fetches.push(fetch("https://cdn.dashcraft.io/v2/prod/track/" + IDarr[i] + ".json?v=3")
      .then((response) => response.json())
      .then((json) => {
        return json
      }));
  }

  Promise.all(fetches)
    .then((IDL) => {
      for (let i = 0; i < IDL.length; i += 2) {
        tracks.push(IDL[i])
        tracks[tracks.length - 1].data = IDL[i + 1]
      }
      loopcounter += 1
      if (loopcounter < IDarr.length/500) {
        getTrackInfo(IDarr)
      } else {
        loopcounter = 0
        getUserInfo()
      }
    })
}

function getUserInfo() {
  var fetches = [];
  var count = 0;
  for (let i = loopcounter*500; i < tracks.length && i < 500+loopcounter*500; i++) {
    fetches.push(fetch("https://api.dashcraft.io/userv2/" + tracks[i].user._id, {
      headers: {
        'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NWM0NmMzNGExYmEyMjQyNGYyZTAwMzIiLCJpbnRlbnQiOiJvQXV0aCIsImlhdCI6MTcwNzM3MTU3Mn0.0JVw6gJhs4R7bQGjr8cKGLE7CLAGvyuMiee7yvpsrWg'
      }
    })
      .then((response) => response.json())
      .then((json) => {
        count += 1
        document.getElementById("progress").innerHTML = "Fetching user info... (" + (count + loopcounter * 500) + "/" + tracks.length + ")";
        console.log(json)
        return json
      }));
  }

  Promise.all(fetches)
    .then((IDL) => {
      for (let i = 0; i < IDL.length; i++) {
        tracks[i+loopcounter*500].user.profile = IDL[i];
      }
      loopcounter += 1
      if (loopcounter < tracks.length/500) {
        getUserInfo()
      } else {
        console.log(tracks)
        sortTracks()
      }

    })
}

function sortTracks() {
  for (let i = 0; i < tracks.length; i++) {
    if (tracks[i].data._id != tracks[i]._id) {
      console.log(i, "track id")
    }
    if (tracks[i].user._id != tracks[i].user.profile._id) {
      console.log(i, "user id")
    }
    var points = 0;
    if (tracks[i].likesCount / (tracks[i].leaderboardTotalCount + 1) < 0.3) {
      points += 15 * tracks[i].likesCount / (tracks[i].leaderboardTotalCount + 1) // players to like ratio
    } else {
      points += 4.5
    }
    points += 3 * tracks[i].likesCount / (tracks[i].likesCount + tracks[i].dislikesCount + 1) // like to dislike ratio
    points += Math.log10(tracks[i].user.profile.likesCount + 1) // total player likes
    points += Math.log2(tracks[i].user.profile.followersCount + 1) // user followers
    points += tracks[i].user.leagueNr / 3
    if (tracks[i].leaderboard.length > 0) {
      points += Math.log2(tracks[i].data.trackPieces.length / tracks[i].leaderboard[0].time)
    }
    points -= Math.log2(i / 50 + 2); // subtract points from older tracks
    tracks[i].points = points;
  }
  tracks.sort(function(a, b) {
    return b.points - a.points;
  })
  trackhtml = document.getElementById("tracks")
  for (let i = 0; i < tracks.length && i < 500; i++) {
    trackhtml.innerHTML += "<br><a href='https://dashcraft.io/?t=" + tracks[i]._id + "' target='_blank'>" + tracks[i].user.username + "</a> " + tracks[i].verified
  }
  trackhtml.innerHTML += "<br><a href='https://dashcraft.io/?t=" + tracks[tracks.length-1]._id + "' target='_blank'>" + tracks[tracks.length-1].user.username + "</a> " + tracks[tracks.length-1].verified
  console.log(tracks)
}