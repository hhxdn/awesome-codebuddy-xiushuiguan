package com.xiushuiguan.dto;

import lombok.Data;

@Data
public class AdvertisementDTO {
    private Long id;
    private String name;
    private String position;
    private Boolean status;
    private Long impressions;
    private Long clicks;
    private Double ctr;
    private Double revenue;
}
