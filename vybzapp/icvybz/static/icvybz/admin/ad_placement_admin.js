(function () {
  function initAdPlacementEpisodeFilter() {
    var seasonSelect = document.getElementById('id_season');
    var episodeSelect = document.getElementById('id_episode');
    if (!seasonSelect || !episodeSelect || !window.VYBZ_AD_PLACEMENT_EPISODE_CHOICES_URL) {
      return;
    }

    function loadEpisodes(seasonId, selectedEpisodeId) {
      episodeSelect.innerHTML = '';
      var blankOption = document.createElement('option');
      blankOption.value = '';
      blankOption.textContent = 'All episodes (season-wide ad)';
      episodeSelect.appendChild(blankOption);

      if (!seasonId) {
        return;
      }

      fetch(
        window.VYBZ_AD_PLACEMENT_EPISODE_CHOICES_URL + '?season=' + encodeURIComponent(seasonId),
        {
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        }
      )
        .then(function (response) { return response.json(); })
        .then(function (data) {
          (data.results || []).forEach(function (item) {
            var option = document.createElement('option');
            option.value = item.id;
            option.textContent = item.label;
            if (selectedEpisodeId && String(item.id) === String(selectedEpisodeId)) {
              option.selected = true;
            }
            episodeSelect.appendChild(option);
          });
        })
        .catch(function () {});
    }

    seasonSelect.addEventListener('change', function () {
      loadEpisodes(seasonSelect.value, null);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdPlacementEpisodeFilter);
  } else {
    initAdPlacementEpisodeFilter();
  }
})();
