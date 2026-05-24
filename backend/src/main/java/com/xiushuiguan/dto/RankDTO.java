package com.xiushuiguan.dto;

import lombok.Data;

@Data
public class RankDTO {

    private Long userId;

    private String nickname;

    private String avatarUrl;

    private Integer highestLevel;

    private Integer totalStars;

    private Integer rank;
}
