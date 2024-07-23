import ytdl from "@distube/ytdl-core";
import { AudioInfo } from "./Player";

type YoutubeResponse<Content extends YoutubeContentDetails> = {
  kind: string;
  etag: string;
  id: { kind: string; videoId: string };
  snippet: YoutubeSnippet;
  contentDetails: Content;
};

type YoutubeSnippet = {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  channelTitle: string;
};

type YoutubePlaylistContentDetails = {
  itemCount: number;
};

type YoutubeVideoContentDetails = {
  duration: string;
  contentRating: Object;
};

type YoutubePlaylistItemContentDetails = {
  videoId: string;
};

type YoutubeContentDetails =
  | YoutubePlaylistContentDetails
  | YoutubePlaylistItemContentDetails
  | YoutubeVideoContentDetails;

enum YoutubeSearchType {
  Playlist = "playlist",
  Video = "video",
}

class Youtube {
  private readonly apiUrl = "https://www.googleapis.com/youtube/v3";
  private readonly apiKey;
  private readonly validPath =
    /^(https:\/\/)?youtu\.be\/|((www|music|gaming)\.)?youtube\.com\/(embed|v|shorts|watch|playlist)/;

  constructor() {
    if (!process.env.YOUTUBE_API_KEY) {
      throw Error("No key given to access Youtube API");
    }
    this.apiKey = process.env.YOUTUBE_API_KEY;
  }

  /**
   * Create the source stream for Player to run.
   * @param url The url to create.
   * @returns The stream of video download.
   */
  public source(url: string): any | undefined {
    const info = url;
    if (info) {
      return ytdl(url, {
        filter: "audioonly",
        highWaterMark: 20 * 60 * 1024 * 1024,
      });
    }
    return undefined;
  }

  /**
   * Get the corresponding info from the given string.
   * @param str The Youtube url or keywords.
   * @returns The info array.
   */
  public async get(str: string): Promise<AudioInfo[]> {
    if (str.match(this.validPath)) {
      return await this.getInfoFromUrl(str);
    }
    const searchList = await this.search(str);
    if (searchList) {
      for (let result of searchList) {
        const info = await this.validCheck(result.id.videoId);
        if (info) {
          return [info];
        }
      }
    }
    return [];
  }

  /**
   * Get the corresponding info from the given url.
   * @param str The url string.
   * @returns The info array.
   */
  private async getInfoFromUrl(str: string): Promise<AudioInfo[]> {
    const url = new URL(str);
    const listId = url.searchParams.get("list");
    const videoId = str.match(/youtu\.be/)
      ? url.pathname.replace("/", "")
      : url.searchParams.get("v");

    let result: AudioInfo[] = [];
    if (listId) {
      const videoList = await this.list(listId);
      if (videoList) {
        const infoList = await Promise.all(
          videoList.map((video) => {
            const detail = video.contentDetails;
            return this.validCheck(detail.videoId);
          })
        );
        infoList.forEach((info) => {
          if (info) {
            result.push(info);
          }
        });
      }
    } else if (videoId) {
      const info = await this.validCheck(videoId);
      if (info) {
        result.push(info);
      }
    }
    return result;
  }

  /**
   * Check if the audio can be played by the player.
   * @param id The youtube id.
   * @returns The info of the audio if valid else undefined.
   */
  private async validCheck(id: string): Promise<AudioInfo | undefined> {
    const info = await this.info<YoutubeVideoContentDetails>(
      id,
      YoutubeSearchType.Video
    );
    if (info) {
      const detail = info!.contentDetails;
      if (Object.keys(detail.contentRating).length == 0) {
        return {
          url: `https://youtu.be/${id}`,
          title: info.snippet.title,
        };
      }
    }
    return undefined;
  }

  /**
   * Send a REST request with the given url and parameters.
   * @param url The URL string.
   * @param param The search param object.
   * @returns the items if success else undefined.
   */
  private async RESTGet<Content extends YoutubeContentDetails>(
    url: string,
    param: URLSearchParams
  ): Promise<YoutubeResponse<Content>[] | undefined> {
    const response = await fetch(`${url}?${param}`, {
      method: "GET",
    });
    if (response.ok) {
      const body = await response.json();
      return body.items;
    }
    return undefined;
  }

  /**
   * Get the video info from url.
   * @param url The video url.
   * @param type The type of item searching
   * @returns The array of video info or undefined.
   */
  private async info<Content extends YoutubeContentDetails>(
    id: string,
    type: Content extends YoutubeVideoContentDetails
      ? YoutubeSearchType.Video
      : YoutubeSearchType.Playlist
  ): Promise<YoutubeResponse<Content> | undefined> {
    const url = `${this.apiUrl}/${type}s`;
    const param = new URLSearchParams([
      ["key", this.apiKey],
      ["part", "contentDetails,snippet"],
      ["id", id],
    ]);
    const info = await this.RESTGet<Content>(url, param);
    return info ? info[0] : undefined;
  }

  /**
   * Return a list of videos from the search string.
   * @param str The video string to search.
   * @returns The array of video id or undefined.
   */
  private async search(
    str: string
  ): Promise<YoutubeResponse<YoutubeContentDetails>[] | undefined> {
    const url = `${this.apiUrl}/search`;
    const param = new URLSearchParams([
      ["key", this.apiKey],
      ["part", "snippet"],
      ["type", "video"],
      ["videoCategoryId", "10"],
      ["q", str.replace(" ", "-")],
    ]);
    return await this.RESTGet<YoutubeContentDetails>(url, param);
  }

  /**
   * Return a list of videos from the playlist id.
   * @param str The video string to search.
   * @param type The type of item searching.
   * @returns The array of video id or undefined.
   */
  private async list(
    id: string
  ): Promise<YoutubeResponse<YoutubePlaylistItemContentDetails>[] | undefined> {
    const url = `${this.apiUrl}/playlistItems`;
    const param = new URLSearchParams([
      ["key", this.apiKey],
      ["part", "contentDetails, snippet"],
      ["playlistId", id],
    ]);

    const listInfo = await this.info<YoutubePlaylistContentDetails>(
      id,
      YoutubeSearchType.Playlist
    );
    if (listInfo) {
      const num = listInfo.contentDetails;
      param.set("maxResults", num.itemCount.toString());
    }

    return await this.RESTGet<YoutubePlaylistItemContentDetails>(url, param);
  }
}

export { Youtube };
